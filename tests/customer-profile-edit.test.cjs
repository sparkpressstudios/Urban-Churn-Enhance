// Execute the real route handlers with an isolated database; no customer data or services.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
function load(file, mocks) {
  const module = { exports: {} };
  const source = fs.readFileSync(path.join(root, file), "utf8");
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
  } }).outputText, {
    module, exports: module.exports, Date,
    console: { info() {}, error() {} },
    require(name) {
      assert.ok(name in mocks, `Unexpected dependency: ${name}`);
      return mocks[name];
    },
  });
  return module.exports;
}
const parser = load("artifacts/api-server/src/lib/customer-edit.ts", {});
function fixture(kind, { hasAccount = true, found = true, collision = false } = {}) {
  const existing = { id: 7, email: "Mixed.Case@Example.test", hasAccount };
  const calls = { updates: [], filters: [] };
  const handlers = {};
  const router = { get() {}, post() {}, delete() {}, patch() {}, put(route, handler) { handlers[route] = handler; } };
  const table = new Proxy({}, { get: (_, key) => `customers.${String(key)}` });
  const db = {
    select() { return { from() { return { where(filter) {
      calls.filters.push(filter);
      return { limit: async () => found ? [existing] : [] };
    } }; } }; },
    update() { return { set(data) {
      calls.updates.push(data);
      return { where(filter) {
        calls.filters.push(filter);
        return { returning: async () => {
          if (collision) throw Object.assign(new Error("duplicate"), { code: "23505" });
          return [{ ...existing, ...data }];
        } };
      } };
    } }; },
  };
  const mocks = {
    express: { Router: () => router }, "@workspace/db": { db },
    "@workspace/db/schema": new Proxy({}, { get: () => table }),
    "drizzle-orm": {
      eq: (...args) => ({ eq: args }), and: (...args) => ({ and: args }),
      sql: (strings, ...values) => ({ sql: strings.join("?"), values }),
    },
    "../../lib/customer-edit": parser,
    "../../lib/square": {}, "../../lib/order-payment": {},
  };
  load(`artifacts/api-server/src/routes/${kind === "admin" ? "admin/customers" : "store/index"}.ts`, mocks);
  return { calls, existing, async save(body) {
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(data) { this.body = data; } };
    await handlers[kind === "admin" ? "/:id" : "/customers/:id"]({ params: { id: "7" }, body, storeLocationId: 42, user: { userId: 3 } }, res);
    return res;
  } };
}
for (const kind of ["admin", "staff"]) {
  for (const hasAccount of [true, false]) {
    for (const edit of [{ firstName: "Updated", lastName: "Name" }, { phone: "555-0101" }, { address: "12 Test Street", city: "Testville", state: "PA", zip: "17001", country: "US" }]) {
      test(`${kind}: ${Object.keys(edit)[0]} edit preserves mixed-case email (account=${hasAccount})`, async () => {
        const f = fixture(kind, { hasAccount });
        const res = await f.save({ ...edit, email: " Mixed.Case@Example.test " });
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.email, f.existing.email);
        assert.equal(Object.hasOwn(f.calls.updates[0], "email"), false);
        for (const [key, value] of Object.entries(edit)) assert.equal(res.body[key], value);
        assert.deepEqual(f.calls.filters[0], f.calls.filters[1]);
        if (kind === "staff") assert.ok(JSON.stringify(f.calls.filters[0]).includes("42"));
      });
    }
  }
  test(`${kind}: genuine registered email change remains protected`, async () => {
    const f = fixture(kind);
    const res = await f.save({ email: "different@example.test", firstName: "Updated" });
    assert.equal(res.statusCode, 409);
    assert.match(res.body.error, /verification/);
    assert.equal(f.calls.updates.length, 0);
  });
  test(`${kind}: unregistered email change remains normalized`, async () => {
    const f = fixture(kind, { hasAccount: false });
    const res = await f.save({ email: " New@Example.test " });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.email, "new@example.test");
  });
  test(`${kind}: genuine duplicate email still returns conflict`, async () => {
    const f = fixture(kind, { hasAccount: false, collision: true });
    const res = await f.save({ email: "taken@example.test" });
    assert.equal(res.statusCode, 409);
    assert.match(res.body.error, /already exists/);
    assert.equal(f.calls.updates[0].email, "taken@example.test");
  });
  test(`${kind}: omitted email remains untouched`, async () => {
    const f = fixture(kind);
    const res = await f.save({ phone: "555-0102" });
    assert.equal(res.statusCode, 200);
    assert.equal(Object.hasOwn(f.calls.updates[0], "email"), false);
  });
  test(`${kind}: missing or inaccessible customer cannot be updated`, async () => {
    const f = fixture(kind, { found: false });
    assert.equal((await f.save({ email: "mixed.case@example.test", phone: "555-0102" })).statusCode, 404);
    assert.equal(f.calls.updates.length, 0);
  });
}
