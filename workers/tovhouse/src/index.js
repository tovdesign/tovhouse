// ===== tovhouse Worker — 7-Layer 보안 적용 =====
// 원칙: 정상 접수자 흐름 차단 금지. 호환 모드로 시작해 관리자 호출부 배포 후 강제 모드 승격.

const ALLOWED_ORIGINS = [
  "https://tovdesign.net",
  "https://www.tovdesign.net",
  "https://admin.tovdesign.net",
  "https://polarad.co.kr",
  "https://www.polarad.co.kr",
];
const PREVIEW_RE = /^https:\/\/tovhouse.*\.vercel\.app$/i;
const MIN_SUBMIT_TIME_MS = 3000;
const RATE_LIMIT_PER_HOUR = 10;

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (url.pathname === "/api/meta-webhook" && request.method === "POST") {
      return handleMetaWebhook(request, env, origin, ctx);
    }

    if (url.pathname === "/api/send-sms" && request.method === "POST") {
      return handleSendSMS(request, env, origin, ctx);
    }

    if (url.pathname === "/api/lead-corp" && request.method === "POST") {
      return handleLeadCorp(request, env, origin, ctx);
    }

    // D1 프록시 (admin Vercel → 워커 → D1)
    if (url.pathname === "/db/query" && request.method === "POST") {
      return handleDbQuery(request, env, ctx);
    }

    // 폴러 수동 실행 (cron을 기다리지 않고 돌릴 때). 시크릿 필수.
    if (url.pathname === "/api/meta-poll" && request.method === "POST") {
      const guard = await guardCallerSecret(request, env);
      if (guard) return guard;
      const dryRun = url.searchParams.get("dry") === "1";
      const report = await pollMetaLeads(env, ctx, { dryRun });
      return json(report, 200, origin);
    }

    if (url.pathname === "/" || url.pathname === "/health") {
      return json({ status: "ok", service: "tovhouse-worker" }, 200, origin);
    }

    return json({ error: "not_found" }, 404, origin);
  },

  // 매시 정각 (wrangler.toml [triggers] crons)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      pollMetaLeads(env, ctx).catch((err) =>
        notifyTelegramAdmin(
          env,
          `[tovhouse/meta-poll] 폴링 실패 ${String(err.message).slice(0, 200)}`,
        ),
      ),
    );
  },
};

// ============ D1 프록시 ============
// admin(Vercel)에서 D1을 쓰기 위한 통로. 임의 SQL을 실행할 수 있어 폼
// 엔드포인트보다 훨씬 강력하므로 **전용 시크릿**(D1_PROXY_TOKEN)을 쓴다.
// WORKER_SHARED_SECRET을 재사용하지 않는 이유 — 폼용 시크릿이 유출돼도
// DB 전체가 열리지 않게 권한을 분리한다.
async function handleDbQuery(request, env, ctx) {
  const ip = request.headers.get("cf-connecting-ip") || "0.0.0.0";

  const expected = env.D1_PROXY_TOKEN;
  if (!expected) {
    console.error("[tovhouse/db-proxy] D1_PROXY_TOKEN 미설정");
    return json({ error: "server_not_configured" }, 500, "");
  }
  const got = (request.headers.get("authorization") || "").replace(
    /^Bearer\s+/i,
    "",
  );
  if (!got || !timingSafeEqual(got, expected)) {
    return json({ error: "unauthorized" }, 401, "");
  }

  if (!(request.headers.get("content-type") || "").includes("application/json"))
    return json({ error: "unsupported_media_type" }, 415, "");
  if (!env.DB) return json({ error: "d1_binding_missing" }, 503, "");

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad_json" }, 400, "");
  }

  try {
    if (Array.isArray(body.batch) && body.batch.length) {
      const stmts = body.batch.map((s) => {
        const stmt = env.DB.prepare(String(s.sql || ""));
        return Array.isArray(s.params) && s.params.length
          ? stmt.bind(...s.params)
          : stmt;
      });
      const results = await env.DB.batch(stmts);
      return json({ results, meta: { count: results.length } }, 200, "");
    }

    const sql = String(body.sql || "");
    if (!sql) return json({ error: "sql_required" }, 400, "");
    const params = Array.isArray(body.params) ? body.params : [];

    const stmt = params.length
      ? env.DB.prepare(sql).bind(...params)
      : env.DB.prepare(sql);
    const result = await stmt.all();
    return json(
      { results: result.results || [], meta: result.meta || {} },
      200,
      "",
    );
  } catch (err) {
    ctx.waitUntil(
      notifyTelegramAdmin(
        env,
        `[tovhouse/db-proxy] 500 IP=${ip} ${String(err.message).slice(0, 200)}`,
      ),
    );
    return json(
      { error: "d1_error", message: String(err.message).slice(0, 200) },
      500,
      "",
    );
  }
}

// ============ META 리드 폴러 ============
// Make 시나리오를 대체한다. 매시 정각에 페이지의 leadgen 폼을 훑어
// 새 리드를 D1 leads에 넣고 텔레그램으로 알린다.
//
// 실측 전제 (2026-07-25):
//  · 페이지 토브하우스(104761508261521), 리드 있는 폼 2개
//  · 전화번호 52건 중 45건이 E.164(+8210…) → 정규화 없으면 대부분 조용히 스킵된다
//  · Make 마지막 처리분 이후 유실 0건 → 컷오버 시각이 깨끗하다

function metaPhone(raw) {
  let p = String(raw || "").replace(/[^0-9]/g, "");
  if (p.startsWith("82")) p = "0" + p.slice(2); // +8210… → 010…
  return p.slice(0, 15);
}

const META_FIELD_MAP = {
  full_name: "name",
  이름: "name",
  phone_number: "phone",
  전화번호: "phone",
  연락처: "phone",
  email: "email",
  이메일: "email",
  공간유형: "interiorType",
  "공간 유형": "interiorType",
  희망예산: "budget",
  "희망 예산": "budget",
  지역: "address",
  주소: "address",
  시공예정일: "schedule",
  "시공 예정일": "schedule",
  평수: "area",
  면적: "area",
};

async function metaGet(env, path, params, token) {
  const v = env.META_GRAPH_VERSION || "v25.0";
  const u = new URL(`https://graph.facebook.com/${v}${path}`);
  for (const [k, val] of Object.entries(params || {}))
    u.searchParams.set(k, val);
  u.searchParams.set("access_token", token);
  const r = await fetch(u);
  const j = await r.json();
  if (!r.ok) {
    throw new Error(
      `meta_${r.status}_${JSON.stringify(j.error || {}).slice(0, 160)}`,
    );
  }
  return j;
}

async function getPageToken(env) {
  // /{page-id}/leadgen_forms 는 페이지 토큰이 필수다.
  // 시스템 사용자 토큰으로 직접 부르면 (#190)이 난다.
  const j = await metaGet(
    env,
    "/me/accounts",
    { fields: "id,name,access_token", limit: "50" },
    env.META_SYSTEM_USER_TOKEN,
  );
  const want = String(env.META_LEAD_PAGE_ID || "");
  const page = (j.data || []).find((p) => String(p.id) === want);
  if (!page?.access_token) {
    throw new Error(`page_token_missing_${want}`);
  }
  return page.access_token;
}

async function pollerState(env, key) {
  const row = await env.DB.prepare(
    "SELECT value FROM poller_state WHERE key = ?",
  )
    .bind(key)
    .first();
  return row?.value || null;
}

async function setPollerState(env, key, value) {
  await env.DB.prepare(
    `INSERT INTO poller_state (key, value, updatedAt) VALUES (?1, ?2, CURRENT_TIMESTAMP)
     ON CONFLICT(key) DO UPDATE SET value = ?2, updatedAt = CURRENT_TIMESTAMP`,
  )
    .bind(key, value)
    .run();
}

async function pollMetaLeads(env, ctx, opts = {}) {
  const dryRun = !!opts.dryRun;
  if (!env.META_SYSTEM_USER_TOKEN)
    throw new Error("META_SYSTEM_USER_TOKEN 미설정");
  if (!env.DB) throw new Error("D1 바인딩(DB) 없음");

  const nowMs = Date.now();
  const cutoverMs = Date.parse(env.META_LEAD_CUTOVER_AT || 0) || 0;
  const overlapMs = Number(env.META_LEAD_OVERLAP_HOURS || 6) * 3600000;
  const lookbackMs = Number(env.META_LEAD_LOOKBACK_HOURS || 48) * 3600000;

  const lastSeen = Number(await pollerState(env, "meta_last_lead_ms")) || 0;
  // 겹쳐 보기 — 폴링 경계에서 새 나가는 건을 막는다. 중복은 metaLeadId UNIQUE가 잡는다.
  let sinceMs = lastSeen
    ? lastSeen - overlapMs
    : Math.max(cutoverMs, nowMs - lookbackMs);
  if (sinceMs < cutoverMs) sinceMs = cutoverMs;

  const pageToken = await getPageToken(env);
  const formsRes = await metaGet(
    env,
    `/${env.META_LEAD_PAGE_ID}/leadgen_forms`,
    { fields: "id,name,status,leads_count", limit: "100" },
    pageToken,
  );
  // 신규 폼도 첫 리드가 생기는 순간 자동 편입된다.
  const forms = (formsRes.data || []).filter(
    (f) => f.status === "ACTIVE" && Number(f.leads_count) > 0,
  );

  const fresh = [];
  let newestMs = lastSeen;

  for (const form of forms) {
    let url = null;
    let guard = 0;
    do {
      const j = url
        ? await (await fetch(url)).json()
        : await metaGet(
            env,
            `/${form.id}/leads`,
            { fields: "id,created_time,field_data", limit: "50" },
            pageToken,
          );
      const rows = j.data || [];
      for (const l of rows) {
        const ms = Date.parse(l.created_time);
        if (ms > newestMs) newestMs = ms;
        if (ms > sinceMs) fresh.push({ form, lead: l, ms });
      }
      // Meta가 filtering 파라미터를 무시하는 경우가 있다. 최신순 결과에서
      // sinceMs보다 오래된 건이 나오면 그 폼은 더 볼 필요가 없다.
      const oldest = rows[rows.length - 1];
      if (!oldest || Date.parse(oldest.created_time) <= sinceMs) break;
      url = j.paging?.next || null;
    } while (url && ++guard < 10);
  }

  fresh.sort((a, b) => a.ms - b.ms);

  const report = {
    ranAt: new Date(nowMs + 9 * 3600000).toISOString(),
    sinceUtc: new Date(sinceMs).toISOString(),
    forms: forms.length,
    found: fresh.length,
    inserted: 0,
    duplicate: 0,
    smsSent: 0,
    errors: [],
    dryRun,
  };

  for (const { form, lead, ms } of fresh) {
    const f = {};
    for (const fd of lead.field_data || []) {
      const key = META_FIELD_MAP[fd.name];
      if (key && !f[key]) f[key] = String(fd.values?.[0] ?? "").slice(0, 500);
    }
    const phone = metaPhone(f.phone);
    const name = (f.name || "").slice(0, 100);
    if (!name && !phone) continue;

    const createdKst = new Date(ms + 9 * 3600000).toISOString();
    const platform = "ig";
    const data = {
      name,
      phone,
      email: f.email || "",
      interiorType: f.interiorType || "",
      budget: f.budget || "",
      area: f.area || "",
      address: f.address || "",
      schedule: f.schedule || "",
      message: `[유입] ${platform}\n[폼] ${form.name}`,
      platform,
      source: "meta",
      metaLeadId: String(lead.id),
      createdAt: createdKst,
    };

    if (dryRun) {
      report.inserted++;
      continue;
    }

    try {
      // 1차 중복 차단: metaLeadId UNIQUE (폴러 자기 재조회 구간 겹침)
      // 2차: Make 전환기에 이미 들어온 행을 연락처+시각으로 흡수해 알림 재발송을 막는다
      const claimed = phone
        ? await env.DB.prepare(
            `UPDATE leads SET metaLeadId = ?1
              WHERE metaLeadId IS NULL AND phone = ?2
                AND ABS(julianday(?3) - julianday(createdAt)) * 86400 < 600`,
          )
            .bind(data.metaLeadId, phone, createdKst)
            .run()
        : { meta: { changes: 0 } };

      if (claimed.meta?.changes > 0) {
        report.duplicate++;
        continue;
      }

      const res = await env.DB.prepare(
        `INSERT OR IGNORE INTO leads
           (metaLeadId,name,phone,email,interiorType,budget,area,address,schedule,message,status,platform,source,createdAt)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,'대기',?11,?12,?13)`,
      )
        .bind(
          data.metaLeadId,
          data.name,
          data.phone,
          data.email,
          data.interiorType,
          data.budget,
          data.area,
          data.address,
          data.schedule,
          data.message,
          data.platform,
          data.source,
          data.createdAt,
        )
        .run();

      if (!res.meta?.changes) {
        report.duplicate++;
        continue;
      }
      report.inserted++;

      // message는 D1 저장용 메모(`[유입]/[폼]`)라 알림 본문에 그대로 넣지 않는다.
      // 폼 이름은 "접수 폼" 줄로, 접수일은 리드 생성 시각(KST)으로 따로 넘긴다.
      await sendTelegram(
        {
          ...data,
          message: "",
          formName: form.name,
          submittedAt: kstStamp(ms),
        },
        env,
      ).catch((e) =>
        report.errors.push(`tg:${String(e.message).slice(0, 80)}`),
      );

      // SMS는 건당 과금 — 기본 꺼져 있다 (META_POLL_SEND_SMS)
      if (
        String(env.META_POLL_SEND_SMS || "0") === "1" &&
        /^01[016789][0-9]{7,8}$/.test(phone)
      ) {
        await sendSMS(data, env)
          .then(() => report.smsSent++)
          .catch((e) =>
            report.errors.push(`sms:${String(e.message).slice(0, 80)}`),
          );
      }
    } catch (err) {
      report.errors.push(`${lead.id}:${String(err.message).slice(0, 120)}`);
    }
  }

  if (!dryRun && newestMs > lastSeen) {
    await setPollerState(env, "meta_last_lead_ms", String(newestMs));
  }

  // 폴링 리포트는 운영 헬스 정보라 인프라봇 전용.
  // 접수 알림 채널(notifyTelegramAdmin)에 섞이면 실제 리드 알림이 묻힌다.
  if (!dryRun && (report.inserted > 0 || report.errors.length)) {
    const text =
      `[tovhouse/meta-poll] 신규 ${report.inserted}건` +
      ` (중복 ${report.duplicate}, SMS ${report.smsSent})` +
      (report.errors.length
        ? `\n에러: ${report.errors.slice(0, 3).join(" / ")}`
        : "");
    await sendInfraHealth(env, text).catch(() => {});

    // 에러는 리드 유실 신호이므로 접수 채널로도 승격
    if (report.errors.length) {
      await notifyTelegramAdmin(
        env,
        `[tovhouse/meta-poll] 리드 처리 실패 ${report.errors.length}건\n` +
          report.errors.slice(0, 3).join("\n"),
      ).catch(() => {});
    }
  }

  return report;
}

// ============ META WEBHOOK ============
async function handleMetaWebhook(request, env, origin, ctx) {
  const ip = request.headers.get("cf-connecting-ip") || "0.0.0.0";

  // Layer 1: Caller auth (호환 모드 — env 미설정 시 경고만, 설정되면 강제)
  const guard = await guardCallerSecret(request, env);
  if (guard) return guard;

  // Layer 2: Content-Type
  if (!(request.headers.get("content-type") || "").includes("application/json"))
    return json({ error: "unsupported_media_type" }, 415, origin);

  // Layer 3: JSON 파싱 안전
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad_json" }, 400, origin);
  }

  // Layer 4: 허니팟 + 타임스탬프 (필드 있으면 검증, 없으면 기존 흐름 통과)
  if (body._hp) return json({ success: true }, 200, origin); // 봇에게 fake 200
  const ts = Number(body._ts) || 0;
  if (ts && Date.now() - ts < MIN_SUBMIT_TIME_MS)
    return json({ error: "too_fast" }, 429, origin);

  // Layer 5: 입력 검증
  const data = {
    name: String(body.name || body.고객명 || "").slice(0, 100),
    phone: String(body.contact || body.phone || body.연락처 || "")
      .replace(/[^0-9]/g, "")
      .slice(0, 15),
    email: String(body.email || "").slice(0, 200),
    interiorType: String(
      body.spaceType || body.interiorType || body.공간유형 || "",
    ).slice(0, 50),
    budget: String(body.budget || body.희망예산 || "").slice(0, 100),
    area: String(body.area || "").slice(0, 50),
    address: String(body.region || body.address || body.지역 || "").slice(
      0,
      200,
    ),
    schedule: String(
      body.scheduledDate || body.schedule || body.시공예정일 || "",
    ).slice(0, 100),
    message: String(body.message || "").slice(0, 2000),
    platform: String(body.platform || body.접수처 || "ig").slice(0, 20),
  };

  if (!data.name && !data.phone) {
    return json({ error: "name_or_phone_required" }, 400, origin);
  }

  // Layer 6: Rate Limit (IP 기반, 시간당)
  const rlKey = new Request("https://rate-limit.internal/meta/" + ip);
  const cache = caches.default;
  const prev = await cache.match(rlKey);
  const count = prev ? Number(await prev.text()) : 0;
  if (count >= RATE_LIMIT_PER_HOUR) {
    ctx.waitUntil(
      notifyTelegramAdmin(env, `[tovhouse/meta-webhook] rate limit IP=${ip}`),
    );
    return json({ error: "rate_limited" }, 429, origin);
  }
  ctx.waitUntil(
    cache.put(
      rlKey,
      new Response(String(count + 1), {
        headers: { "Cache-Control": "max-age=3600" },
      }),
    ),
  );

  // Layer 7: 처리 + 에러 추상화
  try {
    await saveLead(data, env);
    await Promise.allSettled([
      sendTelegram(data, env),
      sendSMS(data, env),
      sendInternalEmail(data, env),
    ]);
    return json({ success: true }, 200, origin);
  } catch (err) {
    ctx.waitUntil(
      notifyTelegramAdmin(
        env,
        `[tovhouse/meta-webhook] 500 IP=${ip} ${String(err.message).slice(0, 200)}`,
      ),
    );
    return json({ error: "internal" }, 500, origin);
  }
}

// ============ SMS ENDPOINT ============
async function handleSendSMS(request, env, origin, ctx) {
  const ip = request.headers.get("cf-connecting-ip") || "0.0.0.0";

  // Caller auth 필수 (SMS = 비용 발생)
  const guard = await guardCallerSecret(request, env);
  if (guard) return guard;

  if (!(request.headers.get("content-type") || "").includes("application/json"))
    return json({ error: "unsupported_media_type" }, 415, origin);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad_json" }, 400, origin);
  }

  if (body._hp) return json({ success: true }, 200, origin);
  const ts = Number(body._ts) || 0;
  if (ts && Date.now() - ts < MIN_SUBMIT_TIME_MS)
    return json({ error: "too_fast" }, 429, origin);

  const phone = String(body.phone || "").replace(/[^0-9]/g, "");
  if (!/^01[016789][0-9]{7,8}$/.test(phone))
    return json({ error: "invalid_phone" }, 400, origin);

  const data = {
    name: String(body.name || "").slice(0, 100),
    phone,
    interiorType: String(body.interiorType || "").slice(0, 50),
    budget: String(body.budget || "").slice(0, 100),
    area: String(body.area || "").slice(0, 50),
    address: String(body.address || "").slice(0, 200),
    schedule: String(body.schedule || "").slice(0, 100),
  };

  // Rate Limit (SMS 별도 키 — 비용 보호 강화)
  const rlKey = new Request("https://rate-limit.internal/sms/" + ip);
  const cache = caches.default;
  const prev = await cache.match(rlKey);
  const count = prev ? Number(await prev.text()) : 0;
  if (count >= RATE_LIMIT_PER_HOUR) {
    ctx.waitUntil(
      notifyTelegramAdmin(env, `[tovhouse/send-sms] rate limit IP=${ip}`),
    );
    return json({ error: "rate_limited" }, 429, origin);
  }
  ctx.waitUntil(
    cache.put(
      rlKey,
      new Response(String(count + 1), {
        headers: { "Cache-Control": "max-age=3600" },
      }),
    ),
  );

  try {
    await sendSMS(data, env);
    return json({ success: true }, 200, origin);
  } catch (err) {
    ctx.waitUntil(
      notifyTelegramAdmin(
        env,
        `[tovhouse/send-sms] 500 IP=${ip} ${String(err.message).slice(0, 200)}`,
      ),
    );
    return json({ error: "internal" }, 500, origin);
  }
}

// ============ LEAD CORP (외부 시스템 → 토브하우스 접수관리) ============
// Make.com 등 외부 자동화에서 토브 법인 폼 데이터를 받아 Airtable에 저장만 수행
// (알림은 외부 Apps Script가 이미 처리 중이므로 여기서는 안 보냄)
async function handleLeadCorp(request, env, origin, ctx) {
  const ip = request.headers.get("cf-connecting-ip") || "0.0.0.0";

  // Layer 1: 전용 Bearer 토큰 (LEAD_CORP_SECRET) 검증 — 강제 모드
  const expected = env.LEAD_CORP_SECRET;
  if (!expected) {
    ctx.waitUntil(
      notifyTelegramAdmin(env, "[tovhouse/lead-corp] LEAD_CORP_SECRET 미설정"),
    );
    return json({ error: "server_misconfigured" }, 500, origin);
  }
  const got = (request.headers.get("authorization") || "").replace(
    /^Bearer\s+/i,
    "",
  );
  if (!got || !timingSafeEqual(got, expected)) {
    return json({ error: "unauthorized" }, 401, origin);
  }

  // Layer 2: Content-Type
  if (!(request.headers.get("content-type") || "").includes("application/json"))
    return json({ error: "unsupported_media_type" }, 415, origin);

  // Layer 3: JSON 파싱 안전
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad_json" }, 400, origin);
  }

  // Layer 4: Rate Limit (시간당 30회 — Make 시나리오 트래픽 여유 있게)
  const rlKey = new Request("https://rate-limit.internal/lead-corp/" + ip);
  const cache = caches.default;
  const prev = await cache.match(rlKey);
  const count = prev ? Number(await prev.text()) : 0;
  if (count >= 30) {
    ctx.waitUntil(
      notifyTelegramAdmin(env, `[tovhouse/lead-corp] rate limit IP=${ip}`),
    );
    return json({ error: "rate_limited" }, 429, origin);
  }
  ctx.waitUntil(
    cache.put(
      rlKey,
      new Response(String(count + 1), {
        headers: { "Cache-Control": "max-age=3600" },
      }),
    ),
  );

  // Layer 5: 입력 검증 + 매핑 (다양한 키 이름 호환: 영문/한글)
  const pick = (...keys) => {
    for (const k of keys) {
      const v = body[k];
      if (v !== undefined && v !== null && String(v).trim() !== "")
        return String(v);
    }
    return "";
  };
  const name = pick("name", "이름", "고객명", "담당자").slice(0, 100);
  let phone = pick("phone", "contact", "tel", "연락처", "전화번호").replace(
    /[^0-9]/g,
    "",
  );
  // 국제번호 정규화: +82 10... → 010...
  if (phone.startsWith("82") && phone.length >= 11) {
    phone = "0" + phone.slice(2);
  }
  phone = phone.slice(0, 15);
  const email = pick("email", "이메일").slice(0, 200);
  const company = pick("company", "회사", "회사명", "법인명").slice(0, 200);
  const message = pick(
    "message",
    "inquiry",
    "문의내용",
    "내용",
    "요청사항",
  ).slice(0, 2000);
  const budget = pick("budget", "예산", "희망 예산", "희망예산").slice(0, 100);
  const interiorType = pick(
    "interiorType",
    "service",
    "category",
    "종류",
    "분야",
    "공간 유형",
    "공간유형",
    "spaceType",
  ).slice(0, 100);
  const platform = pick(
    "platform",
    "유입 플랫폼",
    "유입플랫폼",
    "접수처",
  ).slice(0, 50);
  const customerType = pick(
    "customerType",
    "구분",
    "고객 구분",
    "고객구분",
  ).slice(0, 50);

  // 멱등성 가드 — 구 Apps Script는 시트 J/K열의 발송 로그로 중복을 걸렀다.
  // 시트를 걷어냈으므로 같은 역할을 Cache API로 대체한다.
  // Make 시나리오 재시도·재발화로 같은 건이 두 번 저장·발송되는 것을 막는다.
  // `force: true`면 Apps Script와 동일하게 가드를 건너뛴다.
  const dedupeKey = new Request(
    "https://lead-corp.internal/" +
      encodeURIComponent(`${phone}|${name}`.slice(0, 120)),
  );
  if (!body.force) {
    const seen = await caches.default.match(dedupeKey);
    if (seen) {
      return json(
        {
          status: "skipped",
          message: "이미 접수·발송된 데이터입니다.",
          recordId: await seen.text(),
        },
        200,
        origin,
      );
    }
  }

  if (!name && !phone) {
    return json({ error: "name_or_phone_required" }, 400, origin);
  }

  // 표준 필드 외 추가 정보는 메모 형태로 보존
  const standardKeys = new Set([
    "name",
    "이름",
    "고객명",
    "담당자",
    "phone",
    "contact",
    "tel",
    "연락처",
    "전화번호",
    "email",
    "이메일",
    "company",
    "회사",
    "회사명",
    "법인명",
    "message",
    "inquiry",
    "문의내용",
    "내용",
    "요청사항",
    "budget",
    "예산",
    "희망 예산",
    "희망예산",
    "interiorType",
    "service",
    "category",
    "종류",
    "분야",
    "공간 유형",
    "공간유형",
    "spaceType",
    "address",
    "지역",
    "주소",
    "area",
    "평수",
    "면적",
    "schedule",
    "scheduledDate",
    "시기",
    "희망시기",
    "시공 예정일",
    "시공예정일",
    "platform",
    "유입 플랫폼",
    "유입플랫폼",
    "접수처",
    "customerType",
    "구분",
    "고객 구분",
    "고객구분",
    "접수일",
    "createdAt",
    "_ts",
    "_hp",
  ]);
  const extras = Object.entries(body)
    .filter(([k]) => !standardKeys.has(k))
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
    .map(([k, v]) => `${k}: ${String(v).slice(0, 200)}`)
    .join("\n");

  // D1 저장 — 토브하우스 접수관리 테이블에 통합
  try {
    const composedMessage = [
      customerType ? `[구분] ${customerType}` : "",
      platform ? `[유입] ${platform}` : "",
      company ? `[회사] ${company}` : "",
      message,
      extras ? `\n--- 기타 ---\n${extras}` : "",
    ]
      .filter(Boolean)
      .join("\n")
      .slice(0, 2000);

    const address = pick("address", "지역", "주소").slice(0, 200);
    const area = pick("area", "평수", "면적").slice(0, 50);
    const schedule = pick(
      "schedule",
      "scheduledDate",
      "시기",
      "희망시기",
      "시공 예정일",
      "시공예정일",
    ).slice(0, 100);

    if (!env.DB) throw new Error("d1_binding_missing");
    const ins = await env.DB.prepare(
      `INSERT INTO leads
         (name, phone, email, address, interiorType, area, budget, schedule,
          message, status, source, platform, createdAt)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,'대기','토브법인',?10,?11)`,
    )
      .bind(
        name || "(이름없음)",
        phone,
        email,
        address,
        interiorType,
        area,
        budget,
        schedule,
        composedMessage,
        platform || "",
        new Date(Date.now() + 9 * 3600000).toISOString(),
      )
      .run();
    const recordId = ins.meta?.last_row_id
      ? String(ins.meta.last_row_id)
      : null;

    // 저장 성공 시점에 멱등성 키를 심는다 (1시간). 저장이 실패하면 심지 않아
    // 재시도가 정상적으로 다시 저장된다.
    ctx.waitUntil(
      caches.default.put(
        dedupeKey,
        new Response(String(recordId || ""), {
          headers: { "Cache-Control": "max-age=3600" },
        }),
      ),
    );

    // ---- 알림 (구 Apps Script 대체) ----
    // Apps Script는 sendEmail/sendTelegram 플래그로 개별 차단이 가능했다.
    // Make 시나리오가 이미 쓰고 있을 수 있으므로 동일하게 받는다.
    const corp = {
      name,
      phone,
      email,
      company,
      address,
      interiorType,
      budget,
      schedule,
      platform,
      customerType,
      message,
      extras,
      submittedAt: nowKst(),
      recordId,
    };

    // 컷오버 스위치 — Apps Script가 아직 알림을 담당하는 동안은 꺼둔다.
    // Make 시나리오에서 Apps Script 모듈을 제거한 뒤 CORP_NOTIFY=on 으로 바꾸면
    // 그 순간부터 워커가 알림을 맡는다. 되돌리려면 다시 off.
    const notifyOn = String(env.CORP_NOTIFY || "").toLowerCase() === "on";

    const notify = [];
    if (notifyOn && body.sendTelegram !== false)
      notify.push(sendLeadTelegram(corp, env).catch((e) => e));
    if (notifyOn && body.sendEmail !== false)
      notify.push(sendCorpEmail(corp, env).catch((e) => e));
    const settled = await Promise.all(notify);
    const failed = settled.filter((x) => x instanceof Error);
    if (failed.length) {
      // 저장은 끝났으므로 200을 유지하되 실패는 반드시 드러낸다.
      ctx.waitUntil(
        notifyTelegramAdmin(
          env,
          `[tovhouse/lead-corp] 알림 일부 실패 record=${recordId}\n` +
            failed.map((e) => String(e.message).slice(0, 150)).join("\n"),
        ),
      );
    }

    return json(
      {
        success: true,
        recordId,
        notified: notifyOn
          ? { sent: notify.length - failed.length, failed: failed.length }
          : "off",
      },
      200,
      origin,
    );
  } catch (err) {
    ctx.waitUntil(
      notifyTelegramAdmin(
        env,
        `[tovhouse/lead-corp] 500 IP=${ip} ${String(err.message).slice(0, 200)}`,
      ),
    );
    return json({ error: "internal" }, 500, origin);
  }
}

// ============ 법인 리드 알림 (Apps Script 이관) ============
// 구 tov-corporate-webapp.gs 의 sendEmail/sendTelegram을 워커로 옮긴 것.
// 구글 시트는 더 이상 쓰지 않으므로 시트 기록·시트 링크는 제거하고
// Airtable 접수관리 링크로 대체했다.

function kstStamp(ms) {
  return new Date(ms + 9 * 3600000)
    .toISOString()
    .replace("T", " ")
    .slice(0, 16);
}

function nowKst() {
  return kstStamp(Date.now());
}

// 접수 알림 본문 — 구 Apps Script(tov-corporate-webapp.gs)의 포맷 그대로다.
// Meta 폴러 / meta-webhook / 법인 라우트가 전부 이 한 곳을 쓴다.
// 경로마다 따로 만들면 같은 리드가 유입 경로에 따라 다른 모양으로 도착한다.
const LEAD_NOTIFY_TITLE = "토브디자인 법인사업자 접수";

function platformLabel(p) {
  const v = String(p || "").toLowerCase();
  if (v === "ig" || v === "instagram") return "Instagram";
  if (v === "fb" || v === "facebook") return "Facebook";
  if (v === "web" || v === "홈페이지") return "홈페이지";
  return String(p || "");
}

function leadTelegramText(c) {
  const e = tgEscape;
  const line = (label, v) => (v ? `• ${e(label)}: ${e(v)}\n` : "");
  return (
    `📢 *\\[${e(LEAD_NOTIFY_TITLE)}\\]*\n\n` +
    `🏢 *법인 고객 정보*\n` +
    line("회사명", c.company) +
    line("담당자", c.name) +
    line("연락처", c.phone) +
    line("지역", c.address) +
    `\n📋 *시공 문의 내용*\n` +
    line("공간 유형", c.interiorType) +
    line("희망 예산", c.budget) +
    line("면적", c.area) +
    line("시공 예정일", c.schedule) +
    (c.message
      ? `• ${e("문의")}: ${e(String(c.message).slice(0, 300))}\n`
      : "") +
    `\nℹ️ *접수 정보*\n` +
    line("접수일", c.submittedAt || nowKst()) +
    line("유입 플랫폼", platformLabel(c.platform)) +
    line("접수 폼", c.formName) +
    `• ${e("구분")}: *${e(c.customerType || "법인 고객")}*\n\n` +
    `[접수 관리 →](https://admin.tovdesign.net/#leads)`
  );
}

async function sendLeadTelegram(c, env) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID)
    throw new Error("telegram_not_configured");

  const res = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: leadTelegramText(c),
        parse_mode: "MarkdownV2",
        disable_web_page_preview: true,
      }),
    },
  );
  if (!res.ok) {
    throw new Error(
      `lead_telegram_${res.status}: ${(await res.text()).slice(0, 150)}`,
    );
  }
}

// Gmail: 워커에는 googleapis가 없으므로 refresh token → access token → REST 직접 호출.
async function gmailAccessToken(env) {
  const need = [
    "GMAIL_CLIENT_ID",
    "GMAIL_CLIENT_SECRET",
    "GMAIL_REFRESH_TOKEN",
  ];
  for (const k of need) if (!env[k]) throw new Error(`gmail_missing_${k}`);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GMAIL_CLIENT_ID,
      client_secret: env.GMAIL_CLIENT_SECRET,
      refresh_token: env.GMAIL_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const j = await res.json();
  if (!res.ok || !j.access_token)
    throw new Error(
      `gmail_token_${res.status}: ${JSON.stringify(j).slice(0, 150)}`,
    );
  return j.access_token;
}

function esc(v) {
  if (v === null || v === undefined || v === "") return "-";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// RFC 2047 (한글 제목) + base64url — 워커에는 Buffer가 없다.
function b64(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function b64utf8(str) {
  return b64(new TextEncoder().encode(str));
}
function b64url(str) {
  return b64utf8(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const CORP_MAIL_TO = [
  "2001p@naver.com",
  "mkt@polarad.co.kr",
  "nolla2694@naver.com",
];
const CORP_MAIL_BCC = "mkt@polarad.co.kr";
// 2001p@naver.com 은 2343parksw@gmail.com 계정의 검증된 send-as 별칭
const CORP_MAIL_FROM_ADDR = "2001p@naver.com";
const CORP_MAIL_FROM_NAME = "토브디자인";

// 메일 헤더는 ASCII만 허용한다. 한글 표시명을 그대로 넣으면 수신측이 latin-1로
// 읽어 "í† ë¸Œë””ìž ì ¸" 처럼 깨진다. 제목과 동일하게 RFC 2047로 인코딩한다.
function mimeWord(s) {
  return /^[\x20-\x7E]*$/.test(s) ? s : `=?UTF-8?B?${b64utf8(s)}?=`;
}

function corpEmailHtml(c) {
  const row = (label, value) =>
    `<tr>
      <td style="padding:7px 0;font-size:11px;color:#888;letter-spacing:.5px;width:88px;vertical-align:top">${esc(label)}</td>
      <td style="padding:7px 0;font-size:13px;color:#1a1a1a">${esc(value)}</td>
    </tr>`;
  return (
    `<div style="font-family:-apple-system,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;max-width:580px;margin:0 auto;background:#fff">` +
    `<table width="100%" cellpadding="0" cellspacing="0" style="background:#1a2e22"><tr>` +
    `<td style="padding:18px 32px;font-size:15px;font-weight:300;color:#fff;letter-spacing:5px;text-transform:uppercase">Tov Interior</td>` +
    `<td style="padding:18px 32px;font-size:10px;color:#6b9e7e;letter-spacing:2px;text-transform:uppercase;text-align:right;white-space:nowrap">Corporate Lead</td>` +
    `</tr></table>` +
    `<div style="background:#eef6f0;border-left:3px solid #5a9e6e;padding:9px 24px;font-size:12px;color:#2d5a3f">` +
    `법인 고객의 새로운 시공 문의가 접수되었습니다 — ${esc(c.submittedAt)}</div>` +
    `<div style="padding:24px 28px 20px">` +
    `<p style="font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#777;margin:0 0 10px;padding-bottom:7px;border-bottom:1px solid #f0f0f0">Corporate Client</p>` +
    `<p style="margin:0 0 18px;line-height:1.4">` +
    `<span style="font-size:20px;color:#1a1a1a;letter-spacing:.5px">${esc(c.name)}</span>` +
    `<span style="font-size:14px;color:#5a9e6e;font-weight:500;margin-left:12px">${esc(c.phone)}</span>` +
    (c.company
      ? `<br><span style="font-size:13px;color:#666">${esc(c.company)}</span>`
      : "") +
    `</p>` +
    `<table width="100%" cellpadding="0" cellspacing="0">` +
    row("공간 유형", c.interiorType) +
    row("희망 예산", c.budget) +
    row("지역", c.address) +
    row("시공 예정일", c.schedule) +
    row("이메일", c.email) +
    row("유입 플랫폼", c.platform) +
    row("구분", c.customerType || "법인 고객") +
    (c.message ? row("문의 내용", c.message.slice(0, 500)) : "") +
    (c.extras ? row("기타", c.extras.slice(0, 500)) : "") +
    `</table>` +
    `<p style="margin:22px 0 0"><a href="https://admin.tovdesign.net/#leads" style="display:inline-block;background:#1a2e22;color:#fff;text-decoration:none;font-size:12px;letter-spacing:1px;padding:10px 20px">접수 관리에서 열기</a></p>` +
    `</div>` +
    `<div style="background:#fafafa;border-top:1px solid #f0f0f0;padding:12px 28px;text-align:center">` +
    `<p style="font-size:10px;color:#888;margin:0">토브 인테리어 법인 자동 알림 · tovhouse Worker</p>` +
    `</div></div>`
  );
}

async function sendCorpEmail(c, env) {
  const token = await gmailAccessToken(env);
  const titleName = c.company ? `${c.company} - ${c.name}` : c.name || "신규";
  const subject = `[토브 법인] 새 시공 문의 — ${titleName} / ${c.address || "지역미상"}`;

  const raw = b64url(
    `From: ${mimeWord(CORP_MAIL_FROM_NAME)} <${CORP_MAIL_FROM_ADDR}>\r\n` +
      `To: ${CORP_MAIL_TO.join(", ")}\r\n` +
      `Bcc: ${CORP_MAIL_BCC}\r\n` +
      `Subject: ${mimeWord(subject)}\r\n` +
      `MIME-Version: 1.0\r\n` +
      `Content-Type: text/html; charset=utf-8\r\n\r\n` +
      corpEmailHtml(c),
  );

  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    },
  );
  if (!res.ok) {
    throw new Error(
      `corp_email_${res.status}: ${(await res.text()).slice(0, 150)}`,
    );
  }
}

// ============ D1 저장 ============
// 이전에는 Airtable로 넣었는데, wrangler.toml의 AIRTABLE_TABLE_ID가 필드가
// 'Name' 하나뿐인 빈 기본 테이블("Table 1")을 가리키고 있어서 실제로는
// UNKNOWN_FIELD_NAME(422)로 계속 실패하고 있었다. Meta 유래 레코드가 한 건도
// 없던 이유가 이것이다. D1로 옮기면서 해소된다.
async function saveLead(data, env) {
  if (!env.DB) throw new Error("d1_binding_missing");
  const res = await env.DB.prepare(
    `INSERT INTO leads
       (name, phone, email, interiorType, budget, area, address, schedule,
        message, status, platform, source, createdAt)
     VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,'대기',?10,?11,?12)`,
  )
    .bind(
      data.name || "",
      data.phone || "",
      data.email || "",
      data.interiorType || "",
      data.budget || "",
      data.area || "",
      data.address || "",
      data.schedule || "",
      data.message || "",
      data.platform || "ig",
      data.source || "meta",
      new Date(Date.now() + 9 * 3600000).toISOString(),
    )
    .run();
  return { id: res.meta?.last_row_id };
}

// ============ TELEGRAM (MarkdownV2 escape) ============
function tgEscape(s) {
  return String(s || "").replace(/[_*\[\]()~`>#+\-=|{}.!\\]/g, (m) => "\\" + m);
}

// Meta 리드(폴러·webhook) 알림. 법인 접수와 같은 본문을 쓴다 — 유입이 Meta든
// 홈페이지든 접수 알림 한 종류만 도착해야 한다.
async function sendTelegram(data, env) {
  return sendLeadTelegram({ ...data, platform: data.platform || "ig" }, env);
}

// 인프라봇 — 폴링 헬스/운영 리포트 전용 채널 (접수 알림과 분리)
async function sendInfraHealth(env, text) {
  const botToken = String(env.TELEGRAM_INFRA_BOT_TOKEN || "").trim();
  const chatId = String(env.TELEGRAM_INFRA_CHAT_ID || "").trim();
  if (!botToken || !chatId) {
    console.error("[tovhouse/meta-poll] 인프라봇 설정 누락 — 리포트 생략");
    return;
  }
  const res = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    // 인프라 채널이 죽으면 폴링이 조용히 사라지므로 이때만 접수 채널로 승격
    const why = String(data.description || `HTTP ${res.status}`).slice(0, 160);
    console.error(`[tovhouse/meta-poll] 인프라봇 전송 실패 ${why}`);
    await notifyTelegramAdmin(
      env,
      `[tovhouse/meta-poll] 인프라봇 리포트 전송 실패: ${why}`,
    ).catch(() => {});
  }
}

async function notifyTelegramAdmin(env, text) {
  if (!env.TELEGRAM_BOT_TOKEN) return;
  await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_ADMIN_CHAT_ID || env.TELEGRAM_CHAT_ID,
        text, // plain text — parse_mode 없음
        disable_web_page_preview: true,
      }),
    },
  );
}

// ============ NCP SMS ============
async function sendSMS(data, env) {
  const serviceId = env.SENS_SERVICE_ID;
  const accessKey = env.SENS_ACCESS_KEY;
  const secretKey = env.SENS_SECRET_KEY;
  const sender = env.SENS_SENDER || "03196822224";
  if (!serviceId || !accessKey || !secretKey) return;

  const phone = (data.phone || "").replace(/[^0-9]/g, "");
  if (!phone || phone.length < 10) return;

  const timestamp = Date.now().toString();
  const method = "POST";
  const urlPath = `/sms/v2/services/${encodeURIComponent(serviceId)}/messages`;

  const sigString = `${method} ${urlPath}\n${timestamp}\n${accessKey}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secretKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(sigString),
  );
  const signature = btoa(String.fromCharCode(...new Uint8Array(sig)));

  const message = `[TOV HOUSE] 상담 접수 확인\n\n${data.name}님, 상담이 정상 접수되었습니다.\n\n■ 접수 내용\n- 종류: ${data.interiorType || "-"}\n- 예산: ${data.budget || "-"}\n- 지역: ${data.address || "-"}\n- 희망시기: ${data.schedule || "-"}\n\n담당 디자이너가 1일 이내 연락드립니다.\n\nTOV HOUSE | tovdesign.net`;

  const res = await fetch(`https://sens.apigw.ntruss.com${urlPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "x-ncp-apigw-timestamp": timestamp,
      "x-ncp-iam-access-key": accessKey,
      "x-ncp-apigw-signature-v2": signature,
    },
    body: JSON.stringify({
      type: "LMS",
      from: sender,
      subject: "[TOV HOUSE] 상담 접수 확인",
      content: message,
      messages: [{ to: phone }],
    }),
  });

  if (!res.ok) {
    throw new Error(`sms_${res.status}`);
  }
}

// ============ INTERNAL EMAIL ============
async function sendInternalEmail(data, env) {
  const key = env.INTERNAL_NOTIFY_KEY;
  if (!key) return;
  const res = await fetch("https://admin.tovdesign.net/api/internal-notify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Notify-Key": key,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`internal_email_${res.status}`);
  }
}

// ============ AUTH / CORS / HELPERS ============
async function guardCallerSecret(request, env) {
  const expected = env.WORKER_SHARED_SECRET;
  if (!expected) {
    // 호환 모드: env 미설정이면 경고만 하고 통과 (마이그레이션 기간)
    console.warn("[worker] WORKER_SHARED_SECRET 미설정 — 호환 모드");
    return null;
  }
  const got = (request.headers.get("authorization") || "").replace(
    /^Bearer\s+/i,
    "",
  );
  if (!got || !timingSafeEqual(got, expected)) {
    return json({ error: "unauthorized" }, 401, "");
  }
  return null;
}

function timingSafeEqual(a, b) {
  const ab = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  if (ab.length !== bb.length) return false;
  let r = 0;
  for (let i = 0; i < ab.length; i++) r |= ab[i] ^ bb[i];
  return r === 0;
}

function corsHeaders(origin) {
  const allow =
    ALLOWED_ORIGINS.includes(origin) || PREVIEW_RE.test(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(data, status = 200, origin = "") {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}
