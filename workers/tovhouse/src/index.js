export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (url.pathname === "/api/meta-webhook" && request.method === "POST") {
      return handleMetaWebhook(request, env);
    }

    // SMS-only endpoint (called by admin submit.js)
    if (url.pathname === "/api/send-sms" && request.method === "POST") {
      return handleSendSMS(request, env);
    }

    if (url.pathname === "/" || url.pathname === "/health") {
      return json({ status: "ok", service: "tovhouse-worker" });
    }

    return json({ error: "Not found" }, 404);
  },
};

async function handleMetaWebhook(request, env) {
  try {
    const body = await request.json();

    const data = {
      name: body.name || body.고객명 || "",
      phone: body.contact || body.phone || body.연락처 || "",
      email: body.email || "",
      interiorType: body.spaceType || body.interiorType || body.공간유형 || "",
      budget: body.budget || body.희망예산 || "",
      area: body.area || "",
      address: body.region || body.address || body.지역 || "",
      schedule: body.scheduledDate || body.schedule || body.시공예정일 || "",
      message: body.message || "",
      platform: body.platform || body.접수처 || "ig",
    };

    if (!data.name && !data.phone) {
      return json({ error: "name 또는 phone 필요" }, 400);
    }

    // Save to Airtable
    await saveToAirtable(data, env);

    // Telegram + SMS + Internal email in parallel
    await Promise.allSettled([
      sendTelegram(data, env),
      sendSMS(data, env),
      sendInternalEmail(data, env),
    ]);

    return json({ success: true });
  } catch (err) {
    console.error("Meta webhook error:", err);
    return json({ error: err.message }, 500);
  }
}

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
    const text = await res.text();
    throw new Error(`Airtable ${res.status}: ${text}`);
  }
  return res.json();
}

async function sendTelegram(data, env) {
  const p = (data.platform || "ig").toLowerCase();
  const srcLabel = p === "fb" ? "Meta (Facebook)" : "Meta (Instagram)";
  const text =
    `🔵 *${srcLabel} 새 상담 접수*\n\n` +
    `👤 ${data.name || "-"}\n` +
    `📞 ${data.phone || "-"}\n` +
    `🏠 ${data.interiorType || "-"}\n` +
    `💰 ${data.budget || "-"}\n` +
    `📍 ${data.address || "-"}\n` +
    `🗓 ${data.schedule || "-"}\n` +
    `🕐 ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}\n\n` +
    `[접수 관리 →](https://admin.tovdesign.net/#leads)`;

  await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    },
  );
}

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

  // HMAC-SHA256 signature (Web Crypto API)
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
    const text = await res.text();
    console.error(`SMS error ${res.status}: ${text}`);
  }
}

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
    const text = await res.text();
    console.error(`Internal email error ${res.status}: ${text}`);
  }
}

async function handleSendSMS(request, env) {
  try {
    const body = await request.json();
    const data = {
      name: body.name || "",
      phone: body.phone || "",
      interiorType: body.interiorType || "",
      budget: body.budget || "",
      area: body.area || "",
      address: body.address || "",
      schedule: body.schedule || "",
    };
    if (!data.phone) return json({ error: "phone 필요" }, 400);
    await sendSMS(data, env);
    return json({ success: true });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}
