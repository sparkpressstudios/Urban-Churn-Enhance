// All Square, Resend and database operations in this suite are intercepted fixtures.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const { test } = require("node:test");
const ts = require("typescript");
const ROOT = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(ROOT, p), "utf8");
const TS_OPTS = { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true };
function compile(source, globals = {}, mocks = {}) {
  const module = { exports: {} };
  const context = vm.createContext({
    module, exports: module.exports, process, Buffer, Date, console: { log() {}, warn() {}, error() {} },
    setTimeout, clearTimeout, ...globals,
    require: name => {
      if (name in mocks) return mocks[name];
      throw new Error("Unexpected external module in isolated test: " + name);
    },
  });
  vm.runInContext(ts.transpileModule(source, { compilerOptions: TS_OPTS }).outputText, context);
  return module.exports;
}
function sliceBetween(source, start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a);
  assert(a >= 0 && b > a, "Expected source boundary");
  return source.slice(a, b);
}
const squareRoot = path.dirname(require.resolve("../artifacts/api-server/node_modules/square"));
const sdk = require(path.join(squareRoot, "core/schemas/builders/bigint/bigint.js")).bigint();
function squareExports(client, source = read("artifacts/api-server/src/lib/square.ts")) {
  const chunk = sliceBetween(source, "export interface SquareCustomerRecord", "export async function searchSquareCustomer(");
  return compile(chunk + "\nexport { searchSquareMarketingCustomers };", { getSquareClient: async () => client });
}
function fakeSquare() {
  const searches = [];
  const subscribed = { id: "explicit", emailAddress: "EXPLICIT@example.test", givenName: "Fixture" };
  const optedOut = { id: "opted-out", emailAddress: "opted-out@example.test", preferences: { emailUnsubscribed: true } };
  const noEmail = { id: "no-email" };
  const client = {
    customers: {
      groups: { list: async request => { assert.equal(request.limit, 50); return [{ id: "explicit-group", name: "Customer Sign-up Screen" }, { id: "receipts", name: "Receipt Customers" }]; } },
      segments: { list: async request => { assert.equal(request.limit, 50); return [{ id: "explicit-segment", name: "Email Subscribers" }, { id: "loyalty", name: "Loyalty Customers" }]; } },
      search: async request => {
        const validation = sdk.json(request.limit);
        if (!validation.ok) throw new Error(validation.errors[0].message);
        assert.equal(request.limit, 100n);
        searches.push(request);
        if (request.cursor) return { customers: [noEmail] };
        return { customers: [subscribed, optedOut], cursor: "fixture-page-2" };
      },
    },
  };
  return { client, searches };
}
test("Square 44 serializer reproduces old numeric-limit failure and accepts bigint", async () => {
  const old = fakeSquare();
  await assert.rejects(squareExports(old.client, read("artifacts/api-server/src/lib/square.ts").replace("limit: 100n,", "limit: 100,")).listSquareMarketingCustomers(), /Expected bigint. Received 100/);
  const fixed = fakeSquare();
  await squareExports(fixed.client).listSquareMarketingCustomers();
  assert.equal(fixed.searches.length, 4);
});
test("Installed Square SDK serializes the fixed request with a fully intercepted fetch", async () => {
  const { SquareClient } = require("../artifacts/api-server/node_modules/square");
  const requests = [];
  const client = new SquareClient({
    token: "isolated-fixture-token", maxRetries: 0,
    fetch: async (url, options) => {
      requests.push({ url: String(url), body: JSON.parse(options.body) });
      return new Response(JSON.stringify({ customers: [] }), { status: 200, headers: { "content-type": "application/json" } });
    },
  });
  await assert.rejects(client.customers.search({ limit: 100 }), /Expected bigint/);
  assert.equal(requests.length, 0);
  await squareExports(client).searchSquareMarketingCustomers(client, { segmentIds: { any: ["fixture-segment"] } });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].body.limit, 100);
  assert.deepEqual(requests[0].body.query.filter.segment_ids.any, ["fixture-segment"]);
});
test("Square explicit group/segment audience remains unioned, paginated, deduplicated and opt-out safe", async () => {
  const fixture = fakeSquare();
  const result = await squareExports(fixture.client).listSquareMarketingCustomers();
  assert.equal(result.length, 1);
  assert.equal(result[0].email, "explicit@example.test");
  assert.equal(result[0].marketingConsent, true);
  assert.equal(fixture.searches[0].query.filter.groupIds.any[0], "explicit-group");
  assert.equal(fixture.searches[1].cursor, "fixture-page-2");
  assert.equal(fixture.searches[2].query.filter.segmentIds.any[0], "explicit-segment");
  assert(!fixture.searches.some(r => JSON.stringify(r.query.filter).includes("receipts")));
});
function contact(id, email, status, source) {
  return { id, email, marketingStatus: status, consentSource: source, consentAt: null,
    customProperties: {}, firstName: "", lastName: "", phone: "", address: "", city: "", state: "", zip: "", resendContactId: "resend-" + id };
}
test("Current Square→DB→Resend suppression behavior is preserved in isolated fixtures", async () => {
  const rows = [
    contact(1, "bounce@example.test", "bounced", "website_footer"),
    contact(2, "complaint@example.test", "complained", "website_footer"),
    contact(3, "resend-unsub@example.test", "unsubscribed", "resend_unsubscribe"),
    contact(4, "removed@example.test", "subscribed", "square_marketing_opt_in"),
    contact(5, "website@example.test", "subscribed", "website_footer"),
  ];
  const snapshot = rows.map(r => ({...r}));
  const syncs = [];
  const table = {};
  const db = {
    select: () => ({ from: async () => snapshot }),
    insert: () => ({ values: value => ({ returning: async () => {
      const row = { ...contact(10, value.email, value.marketingStatus, value.consentSource), ...value, id: 10, resendContactId: null };
      rows.push(row); return [row];
    } }) }),
    update: () => ({ set: updates => ({ where: async condition => {
      const row = rows.find(r => r.id === condition.id); Object.assign(row, updates);
    } }) }),
  };
  const list = ["bounce", "complaint", "resend-unsub", "new-explicit"].map((name,i) => ({
    id: "square-" + i, email: name + "@example.test", firstName:"", lastName:"", phone:"", address:"", city:"", state:"", zip:"", marketingConsent:true, emailUnsubscribed:false
  }));
  const source = read("artifacts/api-server/src/lib/resend-marketing.ts");
  const chunk = sliceBetween(source, "type SquareContactSyncResult =", "export async function scheduleMarketingCampaign(");
  const exports = compile(chunk, {
    db, emailContactsTable: table, eq: (_field,id) => ({id}),
    syncContactToResend: async (id,opts={}) => syncs.push({id,...opts}), sleep: async () => {},
  }, { "./square": { listSquareMarketingCustomers: async () => list } });
  const result = await exports.syncSquareCustomersToContacts();
  assert.equal(rows[0].marketingStatus, "bounced");
  assert.equal(rows[1].marketingStatus, "complained");
  assert.equal(rows[2].marketingStatus, "unsubscribed");
  assert.equal(rows[2].consentSource, "resend_unsubscribe");
  assert.equal(rows[3].marketingStatus, "unsubscribed");
  assert.equal(rows[3].consentSource, "square_marketing_opt_out_or_removed");
  assert.equal(rows[4].marketingStatus, "subscribed");
  assert.equal(rows[4].consentSource, "website_footer");
  assert.equal(rows[5].marketingStatus, "subscribed");
  assert.equal(result.imported, 1);
  assert.equal(result.suppressed, 1);
  assert.deepEqual(syncs, [{id:10, allowResubscribe:true}, {id:4}]);
});
const utils = compile(read("artifacts/urban-churn/src/lib/utils.ts"), {}, {
  clsx: { clsx: () => "" }, "tailwind-merge": { twMerge: () => "" },
});
function publicationFunctions(root=ROOT) {
  const source = fs.readFileSync(path.join(root, "artifacts/urban-churn/src/pages/admin/ProductEdit.tsx"), "utf8");
  const display = source.match(/publishedAt: (flavour\.publishedAt[\s\S]*?)\n\s+\}\);/)[1].trim().replace(/,$/, "");
  const start = source.indexOf("publishedAt: form.publishedAt");
  assert(start >= 0);
  const save = source.slice(start + "publishedAt: ".length, source.indexOf("\n        };", start)).trim().replace(/,$/, "");
  return {
    display: new Function("flavour","formatEasternDateTimeLocal", "return (" + display + ");"),
    save: new Function("form","flavour","formatEasternDateTimeLocal","parseEasternDateTimeLocal", "return (" + save + ");"),
  };
}
test("Publication date unchanged-save retains exact instants across host timezones and DST", () => {
  const f = publicationFunctions();
  const dates = ["2026-10-05T16:17:42.123Z", "2026-01-15T17:00:00.000Z", "2026-07-15T16:00:00.000Z", "2026-11-01T05:30:12.500Z", "2026-11-01T06:30:12.500Z"];
  for (const date of dates) {
    const flavour = {publishedAt:date};
    const value = f.display(flavour, utils.formatEasternDateTimeLocal);
    assert.equal(f.save({publishedAt:value},flavour,utils.formatEasternDateTimeLocal,utils.parseEasternDateTimeLocal), date);
  }
  assert.equal(f.display({publishedAt:null},utils.formatEasternDateTimeLocal), "");
  assert.equal(f.save({publishedAt:""},{},utils.formatEasternDateTimeLocal,utils.parseEasternDateTimeLocal), undefined);
});
test("New/edited publication values consistently mean Eastern wall clock", () => {
  const f = publicationFunctions();
  for (const [input,expected] of [
    ["2026-10-05T12:17","2026-10-05T16:17:00.000Z"],
    ["2026-01-15T12:00","2026-01-15T17:00:00.000Z"],
    ["2026-07-15T12:00","2026-07-15T16:00:00.000Z"],
    ["2026-03-08T01:30","2026-03-08T06:30:00.000Z"],
    ["2026-03-08T03:30","2026-03-08T07:30:00.000Z"],
  ]) assert.equal(f.save({publishedAt:input},{},utils.formatEasternDateTimeLocal,utils.parseEasternDateTimeLocal), expected);
});
function webhookFixtures() {
  const routes = {};
  let marketingCalls = 0;
  let stateCalls = 0;
  compile(read("artifacts/api-server/src/routes/webhooks.ts"), {}, {
    express: { Router: () => ({post:(route,handler) => {routes[route]=handler}}) },
    "@workspace/db": { db: new Proxy({}, {get:() => {stateCalls++; throw new Error("Unexpected DB mutation/read")}}) },
    "@workspace/db/schema": {}, "drizzle-orm": {eq:()=>({})}, "node:crypto": crypto,
    "../lib/order-parser": {parseWholesaleEmail:()=>{stateCalls++; throw new Error("Unexpected parser call")}},
    "../lib/email": {},
    "../lib/resend-marketing": {
      getResendMarketingWebhookSecret: async () => "dedicated-fixture-secret",
      verifyResendMarketingWebhook: (_raw,_headers,secret) => {assert.equal(secret,"dedicated-fixture-secret"); return {type:"contact.updated"}},
      handleMarketingWebhookEvent: async () => {marketingCalls++},
    },
  });
  return {routes, counters:()=>({marketingCalls,stateCalls})};
}
function res() {
  return {code:200, body:null, status(code){this.code=code;return this}, json(body){this.body=body;return this}};
}
function signedRequest(body,rawBody=JSON.stringify(body),timestamp=String(Math.floor(Date.now()/1000))) {
  const id="fixture-event";
  const secret=Buffer.from(process.env.RESEND_WEBHOOK_SECRET.replace(/^whsec_/,""),"base64");
  const signature=crypto.createHmac("sha256",secret).update(id+"."+timestamp+"."+rawBody).digest("base64");
  return {body,rawBody,headers:{"svix-id":id,"svix-timestamp":timestamp,"svix-signature":"v1,"+signature}};
}
test("Legacy Resend endpoint rejects absent secret before marketing or transactional side effects", async () => {
  delete process.env.RESEND_WEBHOOK_SECRET;
  for(const body of [{type:"email.bounced",data:{broadcast_id:"fixture"}},{type:"email.received",data:{from:"fixture@example.test",subject:"fixture"}}]){
    const f=webhookFixtures(), out=res();
    await f.routes["/resend"]({body,headers:{},rawBody:JSON.stringify(body)},out);
    assert.equal(out.code,503);
    assert.deepEqual(f.counters(),{marketingCalls:0,stateCalls:0});
  }
});
test("Legacy signed endpoint rejects missing/invalid/replayed/tampered signature without side effects", async () => {
  process.env.RESEND_WEBHOOK_SECRET="whsec_"+Buffer.from("test-fixture-signing-secret").toString("base64");
  const body={type:"email.delivered",data:{broadcast_id:"fixture"}};
  const requests=[
    {body,headers:{},rawBody:JSON.stringify(body)},
    {...signedRequest(body),headers:{"svix-id":"fixture-event","svix-timestamp":String(Math.floor(Date.now()/1000)),"svix-signature":"v1,forged"}},
    signedRequest(body,JSON.stringify(body),String(Math.floor(Date.now()/1000)-600)),
    {...signedRequest(body),rawBody:"tampered"},
    {...signedRequest(body),rawBody:undefined},
  ];
  for(const req of requests){const f=webhookFixtures(),out=res();await f.routes["/resend"](req,out);assert.equal(out.code,401);assert.deepEqual(f.counters(),{marketingCalls:0,stateCalls:0});}
});
test("Legacy valid signatures verify exact raw bytes, including whitespace, then handle event", async () => {
  process.env.RESEND_WEBHOOK_SECRET="whsec_"+Buffer.from("test-fixture-signing-secret").toString("base64");
  const body={type:"email.delivered",data:{broadcast_id:"fixture"}};
  const f=webhookFixtures(),out=res();
  await f.routes["/resend"](signedRequest(body,JSON.stringify(body,null,2)),out);
  assert.equal(out.code,200);
  assert.deepEqual(f.counters(),{marketingCalls:1,stateCalls:0});
});
test("Dedicated marketing endpoint still calls signed verification and rejects unsigned requests", async () => {
  const denied=webhookFixtures(), deniedOut=res();
  await denied.routes["/resend-marketing"]({rawBody:"fixture",headers:{}},deniedOut);
  assert.equal(deniedOut.code,401);
  assert.deepEqual(denied.counters(),{marketingCalls:0,stateCalls:0});
  const f=webhookFixtures(),out=res();
  await f.routes["/resend-marketing"]({rawBody:"fixture",headers:{"svix-id":"fixture","svix-timestamp":"fixture","svix-signature":"fixture"}},out);
  assert.equal(out.code,200);
  assert.deepEqual(f.counters(),{marketingCalls:1,stateCalls:0});
});

test("Overlapping scheduled/manual Square syncs share one run and clear after success/failure", async () => {
  const source=read("artifacts/api-server/src/lib/resend-marketing.ts");
  const chunk=sliceBetween(source,"type SquareContactSyncResult =","export async function scheduleMarketingCampaign(");
  let calls=0, resolveGate, rejectNext=false;
  let gate=new Promise(resolve=>{resolveGate=resolve});
  const exports=compile(chunk, {
    db:{select:()=>({from:async()=>[]})},emailContactsTable:{},
    eq:()=>({}),syncContactToResend:async()=>{},sleep:async()=>{},
  },{"./square":{listSquareMarketingCustomers:async()=>{
    calls++; if(rejectNext){rejectNext=false;throw new Error("Fixture failure")};return gate;
  }}});
  const first=exports.syncSquareCustomersToContacts(), second=exports.syncSquareCustomersToContacts();
  assert.equal(first,second);
  resolveGate([]); await first; assert.equal(calls,1);
  await exports.syncSquareCustomersToContacts(); assert.equal(calls,2);
  rejectNext=true;await assert.rejects(exports.syncSquareCustomersToContacts(),/Fixture failure/);
  await exports.syncSquareCustomersToContacts();assert.equal(calls,4);
});
test("Scheduler registers one daily Eastern Square run and does not import or provision credentials at startup", async () => {
  const jobs=[],timers=[];let syncCalls=0,readinessCalls=0,repairCalls=0;
  const exports=compile(read("artifacts/api-server/src/lib/scheduler.ts"),{setTimeout:fn=>{timers.push(fn)}},{
    "node-cron":{schedule:(expression,callback,options)=>{jobs.push({expression,callback,options})}},
    "@workspace/db":{db:{}}, "@workspace/db/schema":{}, "drizzle-orm":{},
    "./order-payment":{validForFulfillmentSql:()=>({})}, "./email":{},
    "./resend-marketing":{
      getResendMarketingWebhookSecret:async()=>{readinessCalls++;return "fixture-existing-secret"},
      repairLegacyImplicitMarketingConsent:async()=>{repairCalls++;return {repaired:0,resendSuppressed:0}},
      syncSquareCustomersToContacts:async()=>{syncCalls++;return {fetched:0,imported:0,suppressed:0}},
    },
  });
  exports.initScheduler();
  const daily=jobs.filter(j=>j.expression==="17 3 * * *");
  assert.equal(daily.length,1);assert.equal(daily[0].options.timezone,"America/New_York");
  assert.equal(jobs.filter(j=>j.expression==="17 * * * *").length,0);
  timers.forEach(fn=>fn());await new Promise(resolve=>setImmediate(resolve));
  assert.equal(readinessCalls,1);assert.equal(repairCalls,1);assert.equal(syncCalls,0);
  await daily[0].callback();assert.equal(syncCalls,1);
});


test("Square audience discovery fails closed instead of reconciling a false empty audience", async () => {
  await assert.rejects(squareExports(null).listSquareMarketingCustomers(), /not configured/);
  const failed = fakeSquare();
  failed.client.customers.groups.list = async () => { throw new Error("Fixture group lookup failed"); };
  await assert.rejects(squareExports(failed.client).listSquareMarketingCustomers(), /Fixture group lookup failed/);
  assert.equal(failed.searches.length, 0);
  const missing = fakeSquare();
  missing.client.customers.groups.list = async () => [];
  missing.client.customers.segments.list = async () => [];
  await assert.rejects(squareExports(missing.client).listSquareMarketingCustomers(), /audience cannot be reconciled/);
  assert.equal(missing.searches.length, 0);
});
test("Successfully fetched empty recognized subscriber audience remains valid for opt-out reconciliation", async () => {
  const fixture = fakeSquare();
  fixture.client.customers.groups.list = async () => [];
  fixture.client.customers.search = async request => {
    assert.equal(request.limit, 100n); return { customers: [] };
  };
  const records = await squareExports(fixture.client).listSquareMarketingCustomers();
  assert.equal(records.length, 0);
});


test("Account-wide Resend delivery events for unrelated broadcasts cannot mutate Urban campaigns or contacts", async () => {
  let writes=0,reads=0;
  const db={
    select:()=>({from:()=>({where:()=>({limit:async()=>{reads++;return []}})})}),
    update:()=>{writes++;throw new Error("Unexpected unrelated-campaign update")},
    insert:()=>{writes++;throw new Error("Unexpected unrelated-campaign event")},
  };
  const source=read("artifacts/api-server/src/lib/resend-marketing.ts");
  const chunk=sliceBetween(source,"export async function handleMarketingWebhookEvent(","export async function getCampaignLinkStats(");
  const exports=compile(chunk,{db,emailContactsTable:{},emailCampaignsTable:{},emailCampaignEventsTable:{},eq:()=>({})});
  await exports.handleMarketingWebhookEvent({type:"email.bounced",data:{broadcast_id:"unrelated-broadcast",to:["fixture@example.test"]}},{resendEventId:"fixture-unrelated-event"});
  assert.equal(reads,2);assert.equal(writes,0);
  await exports.handleMarketingWebhookEvent({type:"email.bounced",data:{to:["fixture@example.test"]}});
  assert.equal(reads,2);assert.equal(writes,0);
});
test("Resend contact unsubscribe updates only matched local contacts and preserves stronger suppression", async () => {
  const source=read("artifacts/api-server/src/lib/resend-marketing.ts");
  const chunk=sliceBetween(source,"export async function handleMarketingWebhookEvent(","export async function getCampaignLinkStats(");
  for(const status of ["subscribed","bounced","complained",null]){
    const updates=[];
    const row=status?{id:77,marketingStatus:status}:null;
    const db={
      select:()=>({from:()=>({where:()=>({limit:async()=>row?[row]:[]})})}),
      update:()=>({set:changes=>({where:async()=>updates.push(changes)})}),
    };
    const exports=compile(chunk,{db,emailContactsTable:{},emailCampaignsTable:{},emailCampaignEventsTable:{},eq:()=>({})});
    await exports.handleMarketingWebhookEvent({type:"contact.updated",data:{email:"FIXTURE@example.test",unsubscribed:true}});
    assert.equal(updates.length,status==="subscribed"?1:0);
    if(updates.length){assert.equal(updates[0].marketingStatus,"unsubscribed");assert.equal(updates[0].consentSource,"resend_unsubscribe");}
  }
});

