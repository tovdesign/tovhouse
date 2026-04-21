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
