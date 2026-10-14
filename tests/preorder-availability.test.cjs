// Isolated fixtures only: no live records, payments, email, or network access.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const NOW = Date.parse("2026-10-14T19:00:00Z");
let clockNow = NOW;
class Clock extends Date { constructor(...args) { super(...(args.length ? args : [clockNow])); } static now() { return clockNow; } }
function load(file, mocks = {}, globals = {}) {
  const module = { exports: {} };
  const source = fs.readFileSync(path.join(root, file), "utf8").replaceAll("import.meta.env.BASE_URL", '"/"');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText, {
    module, exports: module.exports, Date: Clock, console, process: { env: {} }, ...globals,
    require(name) { assert.ok(name in mocks, `Unexpected dependency: ${name}`); return mocks[name]; },
  });
  return module.exports;
}
const rules = load("lib/api-zod/src/preorder-availability.ts");
const window = (overrides = {}) => ({ id: 10, flavourId: 1, flavourName: "Fixture", status: "open",
  preOrderStart: "2026-10-01T00:00:00-04:00", preOrderEnd: "2026-10-14T15:00:00-04:00",
  pickupDate: "2026-10-15T12:00:00Z", pickupEndDate: "2026-10-20T12:00:00Z", ...overrides });
test("cutoff is exclusive, opening inclusive, and timezone offsets represent exact instants", () => {
  const w = window();
  assert.equal(rules.preorderState(w, NOW - 1), "open");
  assert.equal(rules.preorderState(w, NOW), "closed");
  assert.equal(rules.preorderState(w, NOW + 1), "closed");
  assert.equal(rules.preorderState(w, Date.parse(w.preOrderStart)), "open");
  assert.equal(rules.preorderState(w, Date.parse(w.preOrderStart) - 1), "upcoming");
  const fallBack = window({ preOrderEnd: "2026-11-01T01:30:00-05:00" });
  assert.equal(rules.preorderState(fallBack, Date.parse("2026-11-01T01:30:00-04:00")), "open");
  assert.equal(rules.preorderState(fallBack, Date.parse("2026-11-01T06:30:00Z")), "closed");
});
test("manual closure/cancellation and invalid dates fail closed; scheduled active windows work", () => {
  for (const status of ["closed", "cancelled"]) assert.equal(rules.preorderState(window({ status }), NOW - 1), "closed");
  assert.equal(rules.preorderState(window({ preOrderEnd: "invalid" })), "closed");
  assert.equal(rules.preorderState(window({ status: "scheduled" }), NOW - 1), "open");
  assert.equal(rules.preorderState(undefined), "ordinary");
  assert.equal(rules.preorderUnavailableMessage(undefined), null);
});
test("expired pickup never removes identity; selection is deterministic and a new open cycle wins", () => {
  const old = window({ pickupDate: "2020-01-01T00:00:00Z", pickupEndDate: "2020-01-02T00:00:00Z", status: "closed" });
  assert.equal(rules.selectPreorderWindows([old])[0].id, old.id);
  const next = window({ id: 11, preOrderEnd: "2026-11-01T00:00:00Z" });
  for (const list of [[old, next], [next, old]]) assert.equal(rules.selectPreorderWindows(list)[0].id, 11);
  assert.equal(rules.selectPreorderWindows([window({ status: "draft" })]).length, 0);
});

function server(file, rows, options = {}) {
  const handlers = {}, calls = { writes: 0, charge: 0, items: [] };
  const table = name => new Proxy({ name }, { get: (t, key) => key === "name" ? t.name : `${name}.${String(key)}` });
  const schema = new Proxy({}, { get: (_, name) => table(name) });
  const query = { from() { return this; }, where() { return this; }, innerJoin() { return this; }, leftJoin() { return this; }, orderBy() { return this; }, limit() { return this; }, then(resolve, reject) {
    if (!rows.length) return Promise.reject(new Error("Unexpected database read")).then(resolve, reject);
    const entry = rows.shift(); const row = typeof entry === "function" ? entry() : entry;
    return (row instanceof Error ? Promise.reject(row) : Promise.resolve(row)).then(resolve, reject);
  } };
  const db = { select: () => Object.create(query), insert() { calls.writes++; throw Error("Unexpected write"); }, update() { calls.writes++; throw Error("Unexpected write"); } };
  if (options.persist) {
    db.update = () => ({ set: () => ({ where: async () => { calls.writes++; } }) });
    db.transaction = async callback => callback({
      insert(table) { return { values(value) {
        calls.writes++;
        if (table.name === "ordersTable") return { returning: async () => [{ id: 77, ...value }] };
        calls.items.push(value); return Promise.resolve();
      } }; },
      update: db.update,
      select: () => ({ from: () => ({ where: async () => calls.items }) }),
    });
  }
  const router = { get(route, handler) { handlers[route] = handler; }, post(route, ...handlersForRoute) { handlers[route] = handlersForRoute.at(-1); } };
  const sql = (...args) => args;
  const multer = Object.assign(() => ({ single: () => () => {} }), { diskStorage: () => ({}) });
  const mocks = {
    express: { Router: () => router }, multer, "node:path": path, "node:fs": { mkdirSync() {} }, "node:crypto": require("node:crypto"),
    "@workspace/db": { db }, "@workspace/db/schema": schema, "@workspace/api-zod/preorder-availability": rules,
    "drizzle-orm": { eq: sql, and: sql, or: sql, sql, inArray: sql, lte: sql, gte: sql, lt: sql, asc: sql, desc: sql },
    "../lib/password": {}, "../lib/jwt": {}, "../lib/email": new Proxy({}, { get: () => async () => {} }), "../lib/square": {}, "../lib/payment-errors": {},
    "../lib/order-payment": { resolveOrderLineFromCatalog: async (flavourName, sizeName) => ({ flavourName, sizeName, priceCents: options.persist ? 0 : 500, productId: 1 }), findPaidOrderByCheckoutId: async () => null },
    "../lib/checkout-payment": { chargeBeforeOrderPersist() { calls.charge++; throw Error("Unexpected payment"); } },
  };
  load(file, mocks, { process: { env: {}, cwd: () => root } });
  return { calls, async invoke(route, req = {}) {
    const res = { statusCode: 200, headers: {}, status(code) { this.statusCode = code; return this; }, set(k, v) { this.headers[k] = v; }, json(body) { this.body = body; } };
    await handlers[route]({ query: {}, ...req }, res); return res;
  } };
}
const publicFile = "artifacts/api-server/src/routes/public.ts";
const orderRequest = { body: { locationId: 2, customerName: "Test", customerEmail: "fixture@example.test", items: [{ flavourName: "Fixture", sizeName: "Pint", quantity: 1 }] } };
for (const w of [window(), window({ status: "closed", preOrderEnd: "2027-01-01T00:00:00Z" }), window({ preOrderStart: "2027-01-01T00:00:00Z", preOrderEnd: "2027-02-01T00:00:00Z" })]) {
  test(`direct/stale checkout rejects unavailable preorder before writes/payment: ${w.status}/${w.preOrderEnd}`, async () => {
    const f = server(publicFile, [[w]]);
    const res = await f.invoke("/orders", orderRequest);
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.code, "PREORDER_CLOSED");
    assert.equal(f.calls.writes, 0); assert.equal(f.calls.charge, 0);
  });
}
test("closed cart returns no pickup locations instead of unrestricted pickup", async () => {
  const f = server(publicFile, [[window()]]);
  const res = await f.invoke("/pre-order-locations", { query: { flavourIds: "1" } });
  assert.equal(res.body.length, 0); assert.equal(res.headers["Cache-Control"], "no-store");
});
test("ordinary products still receive ordinary pickup locations", async () => {
  const f = server(publicFile, [[], [{ id: 2, name: "Fixture store" }], []]);
  const res = await f.invoke("/pre-order-locations", { query: { flavourIds: "99" } });
  assert.equal(res.body[0].id, 2);
});
test("active preorder continues enforcing configured location membership", async () => {
  const f = server(publicFile, [[window({ preOrderEnd: "2027-01-01T00:00:00Z" })], [], [{ preOrderId: 10, locationId: 3 }]]);
  const res = await f.invoke("/orders", orderRequest);
  assert.equal(res.statusCode, 400); assert.match(res.body.error, /selected location/);
  assert.equal(f.calls.writes, 0);
});
test("ordinary checkout is not blocked by absence of an open preorder", async () => {
  const reachedAccountHandling = new Error("VALIDATED ordinary checkout");
  const f = server(publicFile, [[], reachedAccountHandling]);
  await assert.rejects(f.invoke("/orders", orderRequest), error => error === reachedAccountHandling);
});
test("active preorder plus ordinary item passes availability and pickup validation", async () => {
  const reachedAccountHandling = new Error("VALIDATED mixed checkout");
  const f = server(publicFile, [[window({ preOrderEnd: "2027-01-01T00:00:00Z" })], [], [{ preOrderId: 10, locationId: 2 }], reachedAccountHandling]);
  const req = { body: { ...orderRequest.body, items: [...orderRequest.body.items, { flavourName: "Ordinary", sizeName: "Pint", quantity: 1 }] } };
  await assert.rejects(f.invoke("/orders", req), error => error === reachedAccountHandling);
});
test("public windows retain closed identity after pickup and preserve location pickup overrides", async () => {
  const old = window({ status: "closed", pickupDate: "2020-01-01T00:00:00Z", pickupEndDate: "2020-01-02T00:00:00Z" });
  const override = "2020-01-01T15:00:00Z";
  const f = server("artifacts/api-server/src/routes/bakery-orders.ts", [[old], [{ preOrderId: 10, pickupStartDate: override }], [{ id: 1, flavourId: 1 }]]);
  const res = await f.invoke("/windows/active", { query: { locationId: "2" } });
  assert.equal(res.statusCode, 200); assert.equal(res.body.length, 1);
  assert.equal(res.body[0].acceptingOrders, false); assert.equal(res.body[0].pickupDate, override);
  assert.equal(res.body[0].pickupEndDate, old.pickupEndDate);
});
test("valid checkout persists its preorder window and configured location pickup date", async () => {
  const pickup = new Date("2026-10-16T16:00:00Z");
  const f = server(publicFile, [
    [window({ preOrderEnd: "2027-01-01T00:00:00Z" })],
    [{ preOrderId: 10, pickupStartDate: pickup }], [{ preOrderId: 10, locationId: 2 }],
    [{ id: 4 }], [{ squareCustomerId: "fixture-only" }], [], [],
  ], { persist: true });
  const res = await f.invoke("/orders", orderRequest);
  assert.equal(res.statusCode, 201);
  assert.equal(f.calls.items[0].preOrderWindowId, 10);
  assert.equal(f.calls.items[0].pickupDate, pickup);
  assert.equal(f.calls.charge, 0);
});
test("ordinary checkout persists no preorder window or forced pickup date", async () => {
  const f = server(publicFile, [[], [{ id: 4 }], [{ squareCustomerId: "fixture-only" }], [], []], { persist: true });
  const res = await f.invoke("/orders", orderRequest);
  assert.equal(res.statusCode, 201);
  assert.equal(f.calls.items[0].preOrderWindowId, null);
  assert.equal(f.calls.items[0].pickupDate, null);
});
test("checkout crossing cutoff during async setup cannot charge or persist an order", async () => {
  const f = server(publicFile, [
    [window({ preOrderEnd: new Date(NOW + 1) })], [], [], [{ id: 4 }],
    () => { clockNow = NOW + 1; return [{ squareCustomerId: "fixture-only" }]; },
  ], { persist: true });
  try {
    const res = await f.invoke("/orders", orderRequest);
    assert.equal(res.statusCode, 409); assert.equal(res.body.code, "PREORDER_CLOSED");
    assert.equal(f.calls.charge, 0); assert.equal(f.calls.items.length, 0);
  } finally { clockNow = NOW; }
});

const React = require("../artifacts/urban-churn/node_modules/react");
const { renderToStaticMarkup } = require("../artifacts/urban-churn/node_modules/react-dom/server");
function renderPage(name, windows, { soldOut = false, cart = false } = {}) {
  const flavour = { id: 1, name: "Fixture", slug: "fixture", available: true, tag: "limited", basePrice: "5", description: "Fixture flavour" };
  const size = { id: 1, name: "Pint", price: "5" };
  const products = [{ id: 1, flavourId: 1, sizeId: 1, manageStock: true, stockQuantity: soldOut ? 0 : 10, available: true, lowStockThreshold: 2 }];
  const empty = () => null;
  const wrap = ({ children }) => React.createElement("div", null, children);
  const mocks = {
    react: React, "react/jsx-runtime": require("../artifacts/urban-churn/node_modules/react/jsx-runtime"),
    wouter: { useParams: () => ({ slug: "fixture" }), useLocation: () => ["", () => {}], Link: wrap },
    "lucide-react": new Proxy({}, { get: () => empty }),
    "framer-motion": { motion: new Proxy({}, { get: () => wrap }), AnimatePresence: wrap },
    "@tanstack/react-query": { useQuery: ({ queryKey }) => ({ data: queryKey[1] === "flavours" ? [flavour] : queryKey[1] === "sizes" ? [size] : queryKey[1] === "products" ? products : [] }), useMutation: () => ({}) },
    "@/components/Navbar": empty, "@/components/Footer": empty, "@/components/SEO": empty, "@/components/GiftCardSection": empty,
    "@/components/ui/sheet": new Proxy({}, { get: () => wrap }), "@/components/ui/dialog": new Proxy({}, { get: () => wrap }),
    "@/components/CustomerAuthContext": { useCustomerAuth: () => ({ customer: null }) },
    "@/lib/api": { api: {} }, "@/lib/utils": { TAG_LABELS: {}, TAG_CLASSES: {} }, "@/hooks/use-toast": { useToast: () => ({ toast() {} }) },
    "@/hooks/useSquareCard": { useSquareCard: () => ({ cardRef: { current: null } }) },
    "@/hooks/use-preorder-availability": { usePreorderAvailability: () => ({ ready: true, windows: rules.selectPreorderWindows(windows).map(w => ({ ...w, acceptingOrders: rules.preorderState(w) === "open" })) }) },
    "@workspace/api-zod/preorder-availability": rules,
  };
  const storage = { getItem: key => key === "uc-cart" && cart ? JSON.stringify({ timestamp: NOW, items: [{ flavour, size, quantity: 1 }] }) : null };
  const Page = load(`artifacts/urban-churn/src/pages/${name}.tsx`, mocks, { localStorage: storage, sessionStorage: storage }).default;
  return renderToStaticMarkup(React.createElement(Page));
}
for (const page of ["PreOrder", "ProductDetail"]) {
  test(`${page}: closed preorder displays closure and never Available Now`, () => {
    const html = renderPage(page, [window()], { cart: true });
    assert.match(html, /Preorders closed/); assert.doesNotMatch(html, /Available Now|Ready for pickup|Add to Cart/);
  });
  test(`${page}: active preorder retains pickup dates`, () => {
    const html = renderPage(page, [window({ preOrderEnd: "2027-01-01T00:00:00Z" })]);
    assert.match(html, /Pickup/); assert.doesNotMatch(html, /Preorders closed|Available Now/);
  });
  test(`${page}: ordinary product remains available; exhausted inventory says Sold Out`, () => {
    assert.match(renderPage(page, []), /Available Now/);
    assert.match(renderPage(page, [], { soldOut: true }), /Sold Out/);
  });
}
