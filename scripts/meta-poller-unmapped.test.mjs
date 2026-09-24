import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../workers/tovhouse/src/index.js", import.meta.url), "utf8");
const { default: worker } = await import(`data:text/javascript,${encodeURIComponent(source)}`);
const realFetch = globalThis.fetch;
const sent = [];
const inserted = [];
let watermark = null;
const env = {
  WORKER_SHARED_SECRET: "fixture-secret",
  META_SYSTEM_USER_TOKEN: "fixture-token",
  META_LEAD_PAGE_ID: "page",
  META_LEAD_CUTOVER_AT: "2026-01-01T00:00:00Z",
  TELEGRAM_BOT_TOKEN: "reception-token",
  TELEGRAM_CHAT_ID: "reception-chat",
  TELEGRAM_INFRA_BOT_TOKEN: "infra-token",
  TELEGRAM_INFRA_CHAT_ID: "infra-chat",
  DB: {
    prepare(sql) {
      let args = [];
      return {
        bind(...values) { args = values; return this; },
        async first() {
          if (sql.includes("FROM poller_state")) return null;
          if (sql.includes("WHERE metaLeadId")) return null;
          throw new Error(`Unexpected query: ${sql}`);
        },
        async run() {
          if (sql.includes("INSERT OR IGNORE INTO leads")) inserted.push(args);
          if (sql.includes("INSERT INTO poller_state")) watermark = args[1];
          return { meta: { changes: 1 } };
        },
      };
    },
  },
};

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
    id: "fixture-lead",
    created_time: new Date(Date.now() - 3600000).toISOString(),
    field_data: [{ name: "새 질문", values: ["원본 답변"] }],
  }] });
  if (url.includes("api.telegram.org")) {
    sent.push({ url, body: JSON.parse(options.body) });
    return reply({ ok: true });
  }
  throw new Error(`Unexpected fetch: ${url}`);
};

try {
  const response = await worker.fetch(new Request("https://worker.example/api/meta-poll", {
    method: "POST",
    headers: { Authorization: "Bearer fixture-secret" },
  }), env, { waitUntil() {} });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.inserted, 1);
  assert.deepEqual(result.needsReview, ["fixture-lead"]);
  assert.equal(inserted.length, 1);
  assert.equal(inserted[0][0], "fixture-lead");
  assert.equal(inserted[0][10], "대기");
  assert.match(inserted[0][9], /원본 답변/);
  assert.ok(Number(watermark) > 0);
  assert.ok(sent.length >= 1);
  assert.ok(sent.every(({ url, body }) =>
    url.includes("/botinfra-token/") && body.chat_id === "infra-chat"));
  console.log("tovhouse unmapped lead persisted and alerted only to infra");
} finally {
  globalThis.fetch = realFetch;
}
