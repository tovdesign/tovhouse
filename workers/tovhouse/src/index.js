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

    if (url.pathname === "/" || url.pathname === "/health") {
      return json({ status: "ok", service: "tovhouse-worker" }, 200, origin);
    }

    return json({ error: "not_found" }, 404, origin);
  },
};

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
    await saveToAirtable(data, env);
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

  // Airtable 저장 — 토브하우스 접수관리 테이블에 통합
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

    const tableId = env.AIRTABLE_LEADS_TABLE_ID || env.AIRTABLE_TABLE_ID;
    const url = `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${tableId}`;
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

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.AIRTABLE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        typecast: true,
        records: [
          {
            fields: {
              name: name || "(이름없음)",
              phone,
              email,
              address,
              interiorType,
              area,
              budget,
              schedule,
              message: composedMessage,
              status: "대기",
              source: "토브법인",
            },
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`airtable_${res.status}: ${errText.slice(0, 200)}`);
    }
    const result = await res.json();
    const recordId = result.records?.[0]?.id || null;

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
      notify.push(sendCorpTelegram(corp, env).catch((e) => e));
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

function nowKst() {
  return new Date(Date.now() + 9 * 3600000)
    .toISOString()
    .replace("T", " ")
    .slice(0, 16);
}

async function sendCorpTelegram(c, env) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID)
    throw new Error("telegram_not_configured");
  const e = tgEscape;
  const line = (label, v) => (v ? `• ${e(label)}: ${e(v)}\n` : "");
  const text =
    `📢 *\\[토브 법인\\_신규 시공 문의\\]*\n\n` +
    `🏢 *법인 고객 정보*\n` +
    line("회사명", c.company) +
    line("담당자", c.name) +
    line("연락처", c.phone) +
    line("지역", c.address) +
    `\n📋 *시공 문의 내용*\n` +
    line("공간 유형", c.interiorType) +
    line("희망 예산", c.budget) +
    line("시공 예정일", c.schedule) +
    (c.message ? `• ${e("문의")}: ${e(c.message.slice(0, 300))}\n` : "") +
    `\nℹ️ *접수 정보*\n` +
    line("접수일", c.submittedAt) +
    line("유입 플랫폼", c.platform) +
    `• ${e("구분")}: *${e(c.customerType || "법인 고객")}*\n\n` +
    `[접수 관리 →](https://admin.tovdesign.net/#leads)`;

  const res = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text,
        parse_mode: "MarkdownV2",
        disable_web_page_preview: true,
      }),
    },
  );
  if (!res.ok) {
    throw new Error(
      `corp_telegram_${res.status}: ${(await res.text()).slice(0, 150)}`,
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

// ============ AIRTABLE ============
async function saveToAirtable(data, env) {
  const url = `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${env.AIRTABLE_TABLE_ID}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.AIRTABLE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      records: [
        {
          fields: {
            Name: data.name,
            phone: data.phone,
            email: data.email,
            interiorType: data.interiorType,
            budget: data.budget,
            area: data.area,
            address: data.address,
            schedule: data.schedule,
            message: data.message,
            status: "대기",
            platform: data.platform,
            createdAt: new Date(Date.now() + 9 * 3600000).toISOString(),
          },
        },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`airtable_${res.status}`);
  }
  return res.json();
}

// ============ TELEGRAM (MarkdownV2 escape) ============
function tgEscape(s) {
  return String(s || "").replace(/[_*\[\]()~`>#+\-=|{}.!\\]/g, (m) => "\\" + m);
}

async function sendTelegram(data, env) {
  const p = (data.platform || "ig").toLowerCase();
  const srcLabel = p === "fb" ? "Meta \\(Facebook\\)" : "Meta \\(Instagram\\)";
  const text =
    `🔵 *${srcLabel} 새 상담 접수*\n\n` +
    `👤 ${tgEscape(data.name || "-")}\n` +
    `📞 ${tgEscape(data.phone || "-")}\n` +
    `🏠 ${tgEscape(data.interiorType || "-")}\n` +
    `💰 ${tgEscape(data.budget || "-")}\n` +
    `📍 ${tgEscape(data.address || "-")}\n` +
    `🗓 ${tgEscape(data.schedule || "-")}\n` +
    `🕐 ${tgEscape(new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }))}\n\n` +
    `[접수 관리 →](https://admin.tovdesign.net/#leads)`;

  await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text,
        parse_mode: "MarkdownV2",
        disable_web_page_preview: true,
      }),
    },
  );
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
