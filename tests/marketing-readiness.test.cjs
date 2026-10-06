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
    isSquareResendSyncEnabled: () => true,
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
    db:{select:()=>({from:async()=>[]})},emailContactsTable:{}, isSquareResendSyncEnabled:()=>false,
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
    "./square-resend-policy":{isSquareResendSyncEnabled:()=>false},
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

function squarePolicy(value) {
  return compile(read("artifacts/api-server/src/lib/square-resend-policy.ts"), {
    process: { env: value === undefined ? {} : { SQUARE_CONTACT_RESEND_SYNC_ENABLED: value } },
  });
}
test("Square Resend sync is held by default and only explicit true enables it", () => {
  for(const value of [undefined,"","false","TRUE","1","true "]) assert.equal(squarePolicy(value).isSquareResendSyncEnabled(),false);
  assert.equal(squarePolicy("true").isSquareResendSyncEnabled(),true);
  const held=squarePolicy();
  for(const c of [
    {source:"square_sync"},
    {source:"customer_sync",customProperties:{squareCustomerId:"fixture-square-id"}},
    {source:"manual",consentSource:"square_marketing_opt_in"},
    {source:"manual",consentSource:"resend_unsubscribe",customProperties:{squareCustomerId:"fixture-square-id"}},
  ]) assert.equal(held.isSquareContactHeldInNeon(c),true);
  for(const c of [
    {source:"manual",consentSource:"website_footer"},
    {source:"customer_sync",customProperties:null},
    {source:"manual",customProperties:{squareCustomerId:""}},
  ]) assert.equal(held.isSquareContactHeldInNeon(c),false);
});
function contactUpsertFixture(policy=squarePolicy(),error=null) {
  const calls=[];
  const source=read("artifacts/api-server/src/lib/resend-marketing.ts");
  const chunk=sliceBetween(source,"export async function upsertResendContact(","export async function ensureResendSegment(");
  const exports=compile(chunk,{
    isSquareContactHeldInNeon:policy.isSquareContactHeldInNeon,
    resend:{contacts:{
      update:async value=>{calls.push({action:"update",value});return error?{error}:{data:{id:value.id}}},
      create:async value=>{calls.push({action:"create",value});return {data:{id:"fixture-created-id"}}},
      get:async()=>{calls.push({action:"get"});return {data:null}},
    }},
  });
  return {calls,upsert:exports.upsertResendContact};
}
test("Held Square contacts cannot be created, profile-updated or resubscribed", async () => {
  const f=contactUpsertFixture();
  for(const id of [null,"fixture-existing-id"]){
    const c={...contact(1,"fixture@example.test","subscribed","website_footer"),source:"customer_sync",customProperties:{squareCustomerId:"fixture-square-id"},resendContactId:id};
    const before=JSON.stringify(c);
    assert.equal(await f.upsert(c,{allowResubscribe:true}),null);
    assert.equal(JSON.stringify(c),before);
  }
  assert.equal(f.calls.length,0);
});
test("Existing held contacts can only receive safe unsubscribe, never profile fields or creation", async () => {
  for(const status of ["unsubscribed","bounced","complained"]){
    const f=contactUpsertFixture();
    const c={...contact(1,"fixture@example.test",status,"square_marketing_opt_in"),resendContactId:"fixture-existing-id"};
    assert.equal(await f.upsert(c,{allowResubscribe:true}),"fixture-existing-id");
    assert.equal(f.calls.length,1);
    assert.equal(f.calls[0].action,"update");
    assert.deepEqual(Object.keys(f.calls[0].value).sort(),["id","unsubscribed"]);
    assert.equal(f.calls[0].value.unsubscribed,true);
    assert.equal(c.marketingStatus,status);
    const missing={...c,resendContactId:null};
    assert.equal(await f.upsert(missing),null);
    assert.equal(f.calls.length,1);
  }
  const failed=contactUpsertFixture(squarePolicy(),{message:"Fixture missing provider contact"});
  assert.equal(await failed.upsert({...contact(1,"fixture@example.test","unsubscribed","square_marketing_opt_in"),resendContactId:"fixture-deleted-id"}),null);
  assert.deepEqual(failed.calls.map(c=>c.action),["update"]);
});
test("Unrelated contacts and explicitly enabled Square contacts retain normal provider sync", async () => {
  const ordinary=contactUpsertFixture();
  assert.equal(await ordinary.upsert({...contact(1,"fixture@example.test","subscribed","website_footer"),resendContactId:null}),"fixture-created-id");
  assert.equal(ordinary.calls[0].action,"create");
  const enabled=contactUpsertFixture(squarePolicy("true"));
  assert.equal(await enabled.upsert({...contact(1,"fixture@example.test","subscribed","square_marketing_opt_in"),resendContactId:null}),"fixture-created-id");
  assert.equal(enabled.calls[0].action,"create");
});
test("Neon-only daily import retains records and consent while allowing existing opt-out suppression", async () => {
  const rows=[contact(1,"removed@example.test","subscribed","square_marketing_opt_in")];
  const snapshot=rows.map(c=>({...c}));
  const calls=[];
  const db={
    select:()=>({from:async()=>snapshot}),
    insert:()=>({values:value=>({returning:async()=>{const c={...value,id:2,resendContactId:null};rows.push(c);return [c]}})}),
    update:()=>({set:updates=>({where:async({id})=>Object.assign(rows.find(c=>c.id===id),updates)})}),
  };
  const source=read("artifacts/api-server/src/lib/resend-marketing.ts");
  const chunk=sliceBetween(source,"type SquareContactSyncResult =","export async function scheduleMarketingCampaign(");
  const exports=compile(chunk,{
    db,emailContactsTable:{},eq:(_field,id)=>({id}),sleep:async()=>{},
    isSquareResendSyncEnabled:()=>false,
    syncContactToResend:async id=>calls.push({id,status:rows.find(c=>c.id===id).marketingStatus}),
  },{"./square":{listSquareMarketingCustomers:async()=>[{id:"fixture-square",email:"new@example.test",firstName:"Fixture",lastName:"",phone:"",address:"",city:"",state:"",zip:""}]}});
  const result=await exports.syncSquareCustomersToContacts();
  assert.equal(rows.length,2);
  assert.equal(rows[1].source,"square_sync");
  assert.equal(rows[1].marketingStatus,"subscribed");
  assert.equal(rows[1].consentSource,"square_marketing_opt_in");
  assert.equal(rows[1].resendContactId,null);
  assert.equal(rows[0].marketingStatus,"unsubscribed");
  assert.equal(rows[0].consentSource,"square_marketing_opt_out_or_removed");
  assert.equal(result.resendSyncEnabled,false);
  assert.equal(result.resendDeferred,1);
  assert.deepEqual(calls,[{id:1,status:"unsubscribed"}]);
});
function queryRows(rows) {
  return {where(){return this},limit:async()=>rows,then:(resolve,reject)=>Promise.resolve(rows).then(resolve,reject)};
}
function holdFixture({local=[],linked=[],providerPages=[],enabled=false,listThrows=false}={}) {
  const calls=[];
  const contactsTable={},segmentsTable={};
  const policy=squarePolicy(enabled?"true":undefined);
  const db={select:projection=>({from:table=>{
    if(table===segmentsTable)return queryRows([{resendSegmentId:"fixture-segment"}]);
    return queryRows(Object.hasOwn(projection,"resendContactId")?linked:local);
  }})};
  const source=read("artifacts/api-server/src/lib/resend-marketing.ts");
  const chunk=sliceBetween(source,"export async function getSquareResendHoldReason(","/** Best-effort sync after local contact");
  const exports=compile(chunk,{
    db,emailContactsTable:contactsTable,emailSegmentsTable:segmentsTable,
    isSquareResendSyncEnabled:policy.isSquareResendSyncEnabled,
    isSquareContactHeldInNeon:policy.isSquareContactHeldInNeon,
    getSegmentContactIds:async()=>[1],eq:()=>({}),inArray:()=>({}),and:()=>({}),
    resend:{contacts:{list:async options=>{
      calls.push({action:"list",options});
      if(listThrows)throw new Error("Fixture provider failure");
      return providerPages.shift()||{data:{data:[],has_more:false}};
    },segments:{add:async()=>{calls.push({action:"member-add"});throw new Error("Unexpected member-add")}}}},
    ensureResendSegment:async()=>{calls.push({action:"ensure-segment"});return "fixture-segment"},
    upsertResendContact:async()=>{calls.push({action:"upsert"});return null},
    mapWithConcurrency:async()=>[],
  });
  return {calls,...exports};
}
test("Local held Square audience blocks member-add before any provider operation", async () => {
  const f=holdFixture({local:[{source:"square_sync"}]});
  const result=await f.syncSegmentMembersToResend(1);
  assert.equal(result.held,true);
  assert.match(result.error,/held in Neon/);
  assert.equal(f.calls.length,0);
});
test("Stale provider segment cannot bypass Square hold and paginated membership is verified", async () => {
  const f=holdFixture({
    local:[{source:"manual",consentSource:"website_footer"}],
    linked:[{source:"square_sync",email:"held@example.test",resendContactId:"fixture-held-id"}],
    providerPages:[
      {data:{data:[{id:"fixture-independent-id",email:"independent@example.test"}],has_more:true}},
      {data:{data:[{id:"fixture-held-id",email:"held@example.test"}],has_more:false}},
    ],
  });
  const result=await f.syncSegmentMembersToResend(1);
  assert.equal(result.held,true);
  assert.match(result.error,/still contains Square/);
  assert.deepEqual(f.calls.map(c=>c.action),["list","list"]);
  assert.equal(f.calls[1].options.after,"fixture-independent-id");
});
test("Campaign hold fails closed on unverifiable remote membership but permits unrelated audiences", async () => {
  const inputs={local:[{source:"manual"}],linked:[{source:"square_sync",email:"held@example.test",resendContactId:"fixture-held-id"}]};
  for(const providerPages of [[{error:{message:"Fixture denied"}}],[{data:{data:[],has_more:true}}]]){
    const f=holdFixture({...inputs,providerPages});
    assert.match(await f.getSquareResendHoldReason(1),/Cannot verify/);
  }
  const thrown=holdFixture({...inputs,listThrows:true});
  assert.match(await thrown.getSquareResendHoldReason(1),/Cannot verify/);
  const clear=holdFixture({...inputs,providerPages:[{data:{data:[{id:"fixture-independent-id",email:"independent@example.test"}],has_more:false}}]});
  assert.equal(await clear.getSquareResendHoldReason(1),null);
  const enabled=holdFixture({...inputs,enabled:true});
  assert.equal(await enabled.getSquareResendHoldReason(1),null);
  assert.equal(enabled.calls.length,0);
});
test("Held or empty eligible audience never reaches campaign state change or broadcast creation", async () => {
  const source=read("artifacts/api-server/src/lib/resend-marketing.ts");
  const chunk=sliceBetween(source,"export async function sendMarketingCampaign(","export async function handleMarketingWebhookEvent(");
  for(const result of [{synced:0,failed:0,held:true,error:"Fixture Square hold"},{synced:0,failed:0}]){
    const calls=[],campaigns={},templates={};
    const db={
      select:()=>({from:table=>queryRows(table===campaigns?[{id:1,segmentId:1,templateId:1}]:[{id:1,compiledHtml:"fixture"}])}),
      update:()=>{calls.push("update");throw new Error("Unexpected campaign write")},
    };
    const exports=compile(chunk,{
      resend:{broadcasts:{create:async()=>{calls.push("broadcast");throw new Error("Unexpected send")}}},
      db,emailCampaignsTable:campaigns,emailTemplatesTable:templates,eq:()=>({}),
      withMarketingComplianceFooter:value=>value,compileEmailDocument:()=>"",
      syncSegmentMembersToResend:async()=>result,
    });
    const sent=await exports.sendMarketingCampaign(1);
    assert.equal(sent.success,false);
    assert.equal(calls.length,0);
  }
});
test("Square contact hold does not disable transactional mail or signed webhook code", () => {
  const transactional=read("artifacts/api-server/src/lib/email.ts");
  const webhooks=read("artifacts/api-server/src/routes/webhooks.ts");
  assert(!transactional.includes("SQUARE_CONTACT_RESEND_SYNC_ENABLED"));
  assert(!transactional.includes("square-resend-policy"));
  assert(!webhooks.includes("square-resend-policy"));
});


test("Held email blocks stale remote audience even with null or different saved provider ID", async () => {
  for(const resendContactId of [null,"fixture-stale-provider-id"]){
    const f=holdFixture({
      local:[{source:"manual",consentSource:"website_footer"}],
      linked:[{source:"customer_sync",consentSource:"resend_unsubscribe",customProperties:{squareCustomerId:"fixture-square-id"},email:" HELD@EXAMPLE.TEST ",resendContactId}],
      providerPages:[{data:{data:[{id:"fixture-different-provider-id",email:"held@example.test"}],has_more:false}}],
    });
    assert.match(await f.getSquareResendHoldReason(1),/still contains Square/);
    assert.deepEqual(f.calls.map(c=>c.action),["list"]);
  }
});
test("Campaign rechecks held provenance after member sync and before any send-state write", async () => {
  const source=read("artifacts/api-server/src/lib/resend-marketing.ts");
  const chunk=sliceBetween(source,"export async function sendMarketingCampaign(","export async function handleMarketingWebhookEvent(");
  const calls=[],campaigns={},templates={},segments={};
  const db={
    select:()=>({from:table=>queryRows(table===campaigns?[{id:1,segmentId:1,templateId:1}]:table===segments?[{id:1,resendSegmentId:"fixture-segment"}]:[{id:1,compiledHtml:"fixture"}])}),
    update:()=>{calls.push("state-write");throw new Error("Unexpected send state")},
  };
  const exports=compile(chunk,{
    resend:{broadcasts:{create:async()=>{calls.push("broadcast");throw new Error("Unexpected send")}}},
    db,emailCampaignsTable:campaigns,emailTemplatesTable:templates,emailSegmentsTable:segments,eq:()=>({}),
    withMarketingComplianceFooter:value=>value,compileEmailDocument:()=>"",
    syncSegmentMembersToResend:async()=>{calls.push("member-sync");return {synced:1,failed:0}},
    getSquareResendHoldReason:async()=>{calls.push("final-hold-check");return "Fixture Square provenance changed"},
  });
  const result=await exports.sendMarketingCampaign(1);
  assert.equal(result.success,false);
  assert.match(result.error,/provenance changed/);
  assert.deepEqual(calls,["member-sync","final-hold-check"]);
});
