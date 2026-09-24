import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../workers/tovhouse/src/index.js", import.meta.url), "utf8");
const { default: worker } = await import(`data:text/javascript,${encodeURIComponent(source)}`);
const realFetch = globalThis.fetch;
let quotaExceeded = true;
let stored = false;
let watermark = null;
let alerts = 0;
const telegramMessages = [];
const leadTime = new Date(Date.now() - 3600000).toISOString();

function reply(value) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

globalThis.fetch = async (input, options) => {
  const url = String(input);
  if (url.includes("/me/accounts")) return reply({ data: [{ id: "page", access_token: "page-token" }] });
  if (url.includes("/leadgen_forms")) return reply({ data: [{ id: "form", name: "fixture", status: "ACTIVE", leads_count: 1 }] });
  if (url.includes("/form/leads")) return reply({ data: [{
    id: "synthetic-lead", created_time: leadTime,
    field_data: [
      { name: "full_name", values: ["Fixture"] },
      { name: "phone_number", values: ["01000000000"] },
    ],
  }] });
  if (url.includes("oauth2.googleapis.com/token")) return reply({ access_token: "synthetic" });
  if (url.includes("api.telegram.org")) {
    alerts++;
    telegramMessages.push({ url, body: JSON.parse(options.body) });
    return reply({ ok: true });
  }
  if (url.includes("gmail.googleapis.com")) return reply({ id: "synthetic" });
  throw new Error(`Unexpected fetch ${url}`);
};

const env = {
  DB: {
    prepare(sql) {
      let args = [];
      return {
        bind(...values) { args = values; return this; },
        async first() {
          if (sql.includes("FROM poller_state")) return watermark === null ? null : { value: watermark };
          if (sql.includes("WHERE metaLeadId")) {
            if (quotaExceeded) throw new Error("Your account has exceeded D1's free tier daily row read limit");
            return stored ? { id: 1 } : null;
          }
          throw new Error(`Unexpected first: ${sql}`);
        },
        async run() {
          if (sql.includes("UPDATE leads SET metaLeadId")) return { meta: { changes: 0 } };
          if (sql.includes("INSERT OR IGNORE INTO leads")) {
            stored = true;
            return { meta: { changes: 1 } };
          }
          if (sql.includes("INSERT INTO poller_state")) {
            watermark = args[1];
            return { meta: { changes: 1 } };
          }
          throw new Error(`Unexpected run: ${sql}`);
        },
      };
    },
  },
  WORKER_SHARED_SECRET: "synthetic-secret",
  META_SYSTEM_USER_TOKEN: "synthetic-token",
  META_LEAD_PAGE_ID: "page",
  META_LEAD_CUTOVER_AT: "2026-01-01T00:00:00Z",
  META_LEAD_OVERLAP_HOURS: "24",
  META_LEAD_LOOKBACK_HOURS: "48",
  META_POLL_SEND_SMS: "0",
  TELEGRAM_BOT_TOKEN: "reception-token",
  TELEGRAM_CHAT_ID: "reception-chat",
  TELEGRAM_ADMIN_CHAT_ID: "reception-admin-chat",
  TELEGRAM_INFRA_BOT_TOKEN: "infra-token",
  TELEGRAM_INFRA_CHAT_ID: "infra-chat",
  GMAIL_CLIENT_ID: "synthetic",
  GMAIL_CLIENT_SECRET: "synthetic",
  GMAIL_REFRESH_TOKEN: "synthetic",
};

async function run() {
  const request = new Request("https://worker.example/api/meta-poll", {
    method: "POST",
    headers: { Authorization: "Bearer synthetic-secret" },
  });
  const response = await worker.fetch(request, env, { waitUntil() {} });
  assert.equal(response.status, 200);
  return response.json();
}

try {
  const failed = await run();
  assert.equal(failed.errors.length, 1);
  assert.equal(failed.inserted, 0);
  assert.equal(watermark, null, "quota failure must retain the watermark");
  assert.ok(telegramMessages.length > 0);
  assert.ok(telegramMessages.every(({ url, body }) =>
    url.includes("/botinfra-token/") && body.chat_id === "infra-chat"),
    "quota failure must notify only the infra bot");
  quotaExceeded = false;
  const recovered = await run();
  assert.equal(recovered.inserted, 1);
  assert.equal(recovered.errors.length, 0);
  assert.equal(stored, true);
  assert.ok(Number(watermark) > 0);
  assert.ok(telegramMessages.some(({ url, body }) =>
    url.includes("/botreception-token/") && body.chat_id === "reception-chat"),
    "a successful new lead still reaches the reception channel");
  const alertsAfterRecovery = alerts;
  const repeated = await run();
  assert.equal(repeated.inserted, 0);
  assert.equal(repeated.duplicate, 1);
  assert.equal(alerts, alertsAfterRecovery, "duplicate replay must not resend notifications");
  console.log("quota failure, recovery replay, and duplicate suppression verified");
} finally {
  globalThis.fetch = realFetch;
}
