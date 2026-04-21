// © 2024. All Rights Reserved.
// 최종 수정: 2025-08-19 (메이크 웹앱 법인 전용 버전)
//
// ⚠ LEGACY — tovhouse(35.tovhouse2026)에서는 운영 미사용.
//    현재 접수 흐름은 Cloudflare Worker(/api/meta-webhook, /api/send-sms) +
//    admin.tovdesign.net 으로 대체됨. 이 파일은 과거 tovdesign(34.tov2026) 프로젝트의
//    Make.com + Google Sheets 연동 참조용으로만 보관. 재활성화 시 아래 Script Properties
//    등록 필요: WEBHOOK_SECRET, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID.

// ===== 보안 설정 =====
// ⚠ 시크릿은 Script Properties에서 로드 (프로젝트 설정 → 스크립트 속성)
//   필요 속성: WEBHOOK_SECRET, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
function getProp_(key) {
  const v = PropertiesService.getScriptProperties().getProperty(key);
  if (!v) throw new Error("Missing script property: " + key);
  return v;
}

// ===== 웹앱 메인 함수 (메이크에서 호출) =====
function doPost(e) {
  try {
    const SECRET_KEY = getProp_("WEBHOOK_SECRET");
    // Query String에서 시크릿 키 검증
    const querySecret = e.parameter ? e.parameter.secret : null;

    if (!querySecret || querySecret !== SECRET_KEY) {
      console.error('인증 실패: 잘못된 시크릿 키');
      return ContentService
        .createTextOutput(JSON.stringify({ 'status': 'error' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // POST 요청 데이터 파싱
    const data = JSON.parse(e.postData.contents);

    // 스프레드시트 연결
    const SHEET_NAME = "고객정보";
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

    if (!sheet) {
      throw new Error("고객정보 시트를 찾을 수 없습니다.");
    }

    // 행 번호 결정 (전달되지 않으면 새 행 추가)
    let targetRow;

    if (data.row) {
      // 특정 행 번호가 전달된 경우
      targetRow = data.row;
    } else {
      // 새 행 추가 (마지막 행 다음)
      targetRow = sheet.getLastRow() + 1;

      // 새 행에 데이터 입력
      sheet.getRange(targetRow, 1).setValue(data.submissionDate || new Date().toLocaleString('ko-KR'));
      sheet.getRange(targetRow, 2).setValue(data.contact || '');
      sheet.getRange(targetRow, 3).setValue(data.platform || '');
      sheet.getRange(targetRow, 4).setValue(data.name || '');
      sheet.getRange(targetRow, 5).setValue(data.spaceType || '');
      sheet.getRange(targetRow, 6).setValue(data.budget || '');
      sheet.getRange(targetRow, 7).setValue(data.region || '');
      sheet.getRange(targetRow, 8).setValue(data.scheduledDate || '');
      // 법인 전용 필드가 있다면 추가
      if (data.companyName) sheet.getRange(targetRow, 9).setValue(data.companyName);
    }

    // 발송 로그 확인 (J열, K열)
    const emailLog = sheet.getRange(targetRow, 10).getValue();
    const telegramLog = sheet.getRange(targetRow, 11).getValue();

    // 중복 발송 방지 옵션 (force 파라미터로 강제 발송 가능)
    if (!data.force && (emailLog || telegramLog)) {
      return ContentService
        .createTextOutput(JSON.stringify({
          'status': 'skipped',
          'message': '이미 발송된 데이터입니다.',
          'row': targetRow,
          'emailLog': emailLog,
          'telegramLog': telegramLog
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 시트 URL 설정
    data.sheetUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();

    // 이메일 발송
    let emailResult = "미발송";
    if (data.sendEmail !== false) { // 명시적으로 false가 아니면 발송
      emailResult = sendEmail(data, sheet, targetRow);
    }

    // 텔레그램 발송
    let telegramResult = "미발송";
    if (data.sendTelegram !== false) { // 명시적으로 false가 아니면 발송
      telegramResult = sendTelegram(data, sheet, targetRow);
    }

    // 성공 응답
    return ContentService
      .createTextOutput(JSON.stringify({
        'status': 'success',
        'message': '처리 완료',
        'row': targetRow,
        'email': emailResult,
        'telegram': telegramResult,
        'timestamp': new Date().toLocaleString('ko-KR')
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // 에러 응답
    console.error('Error:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        'status': 'error',
        'message': error.toString(),
        'timestamp': new Date().toLocaleString('ko-KR')
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ===== GET 요청 처리 (테스트용) =====
function doGet(e) {
  // 시크릿 키가 있는 경우만 상세 정보 제공
  const SECRET_KEY = getProp_("WEBHOOK_SECRET");
  if (e.parameter && e.parameter.secret === SECRET_KEY) {
    return ContentService
      .createTextOutput(JSON.stringify({
        'status': 'ready',
        'message': '법인 웹앱이 정상 작동 중입니다.',
        'method': 'GET',
        'authenticated': true,
        'type': '법인',
        'info': 'POST 요청으로 데이터를 전송하세요.',
        'timestamp': new Date().toLocaleString('ko-KR')
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 시크릿 키가 없으면 기본 응답만
  return ContentService
    .createTextOutput(JSON.stringify({
      'status': 'ready',
      'message': '법인 웹앱이 작동 중입니다.',
      'authenticated': false
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== 이메일 발송 함수 =====
function sendEmail(data, sheet, row) {
  // 이메일 수신자 설정
  const RECIPIENTS = "2001p@naver.com, mkt@polarad.co.kr, nolla2694@naver.com";
  const BCC = "mkt@polarad.co.kr"; // 숨은참조

  // 데이터 추출
  const submissionDate = data.submissionDate || new Date().toLocaleString('ko-KR');
  const contact = data.contact || '';
  const platform = data.platform || '';
  const name = data.name || '이름없음';
  const companyName = data.companyName || '';  // 법인명
  const spaceType = data.spaceType || '';
  const budget = data.budget || '';
  const region = data.region || '';
  const scheduledDate = data.scheduledDate || '';
  const sheetUrl = data.sheetUrl || '';

  // 제목에 법인명 포함 여부
  const titleName = companyName ? `${companyName} - ${name}` : name;
  const subject = `[토브 법인] 새 시공 문의 — ${titleName} / ${region || '지역미상'}`;

  // 안전한 문자열 처리
  const safe = (v) => (v === null || v === undefined || v === '') ? '-' : String(v);

  const body = `
<div style="font-family: -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff;">

  <!-- 헤더 -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #1a2e22;">
    <tr>
      <td style="padding: 18px 32px; font-size: 15px; font-weight: 300; color: #ffffff; letter-spacing: 5px; text-transform: uppercase;">Tov Interior</td>
      <td style="padding: 18px 32px; font-size: 10px; color: #6b9e7e; letter-spacing: 2px; text-transform: uppercase; text-align: right; white-space: nowrap;">Corporate Lead</td>
    </tr>
  </table>

  <!-- 배너 -->
  <div style="background: #eef6f0; border-left: 3px solid #5a9e6e; padding: 9px 24px; font-size: 12px; color: #2d5a3f; letter-spacing: 0.3px;">
    법인 고객의 새로운 시공 문의가 접수되었습니다 — ${safe(submissionDate)}
  </div>

  <!-- 본문 -->
  <div style="padding: 24px 28px 20px;">

    <!-- Client -->
    <p style="font-size: 10px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #777777; margin: 0 0 10px 0; padding-bottom: 7px; border-bottom: 1px solid #f0f0f0;">Corporate Client</p>
    <p style="margin: 0 0 6px 0; line-height: 1.4;">
      <span style="font-size: 20px; font-weight: 400; color: #1a1a1a; letter-spacing: 0.5px;">${safe(name)}</span>
      <span style="font-size: 14px; color: #5a9e6e; font-weight: 500; letter-spacing: 0.5px; margin-left: 12px;">${safe(contact)}</span>
    </p>
    <p style="margin: 0 0 18px 0;">
      <span style="font-size: 12px; color: #666666; letter-spacing: 0.3px;">${companyName ? safe(companyName) + ' · ' : ''}${safe(region)}</span>
    </p>

    <!-- Project -->
    <p style="font-size: 10px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #777777; margin: 0 0 10px 0; padding-bottom: 7px; border-bottom: 1px solid #f0f0f0;">Project</p>
    <table width="100%" cellpadding="0" cellspacing="1" style="background: #f0f0f0; border-radius: 2px; margin-bottom: 16px;">
      <tr>
        <td width="33%" style="background: #ffffff; padding: 10px 14px;">
          <p style="font-size: 9px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; color: #888888; margin: 0 0 3px 0;">공간유형</p>
          <p style="font-size: 13px; color: #1a1a1a; margin: 0;">${safe(spaceType)}</p>
        </td>
        <td width="33%" style="background: #ffffff; padding: 10px 14px;">
          <p style="font-size: 9px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; color: #888888; margin: 0 0 3px 0;">희망예산</p>
          <p style="font-size: 13px; color: #1a1a1a; margin: 0;">${safe(budget)}</p>
        </td>
        <td width="34%" style="background: #ffffff; padding: 10px 14px;">
          <p style="font-size: 9px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; color: #888888; margin: 0 0 3px 0;">시공예정일</p>
          <p style="font-size: 13px; color: #5a9e6e; font-weight: 500; margin: 0;">${safe(scheduledDate)}</p>
        </td>
      </tr>
    </table>

    <!-- Source + CTA -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background: #fafafa; border-radius: 2px;">
      <tr>
        <td style="padding: 10px 14px;">
          <span style="font-size: 9px; letter-spacing: 1px; color: #888888; text-transform: uppercase;">Platform</span>
          <span style="font-size: 12px; color: #333333; margin-left: 6px;">${safe(platform)}</span>
          &nbsp;&nbsp;&nbsp;
          <span style="font-size: 9px; letter-spacing: 1px; color: #888888; text-transform: uppercase;">Type</span>
          <span style="font-size: 12px; color: #333333; margin-left: 6px;">법인</span>
        </td>
        <td style="padding: 10px 14px; text-align: right; white-space: nowrap;">
          <a href="${sheetUrl}#gid=0&range=${row}:${row}" style="display: inline-block; background: #1a2e22; color: #ffffff; text-decoration: none; padding: 8px 18px; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 500; border-radius: 2px;">시트 확인</a>
        </td>
      </tr>
    </table>

  </div>

  <!-- 푸터 -->
  <div style="background: #fafafa; border-top: 1px solid #f0f0f0; padding: 12px 28px; text-align: center;">
    <p style="font-size: 10px; color: #888888; margin: 0; line-height: 1.6; letter-spacing: 0.3px;">토브 인테리어 법인 자동 알림 · Make Automation</p>
  </div>

</div>`;

  try {
    // 이메일 발송 (GmailApp으로 from 지정 — Gmail "다른 메일로 보내기" 설정 필요)
    GmailApp.sendEmail(RECIPIENTS, subject, '', {
      htmlBody: body,
      bcc: BCC,
      from: '2001p@naver.com',
      name: 'TOV DESIGN'
    });

    // 발송 로그 기록 (J열)
    const timestamp = new Date().toLocaleString('ko-KR');
    sheet.getRange(row, 10).setValue(`✅ 발송완료: ${timestamp}`);

    console.log(`[이메일-법인] ${titleName}님 발송 완료 (${row}행)`);
    return `이메일 발송 성공 (${row}행)`;

  } catch (error) {
    // 발송 실패 로그 기록
    sheet.getRange(row, 10).setValue(`❌ 발송실패: ${error.toString()}`);
    console.error(`[이메일-법인] 발송 실패 (${row}행):`, error);
    throw error;
  }
}

// ===== 텔레그램 발송 함수 =====
function sendTelegram(data, sheet, row) {
  // 시크릿은 Script Properties에서 로드
  const BOT_TOKEN = getProp_("TELEGRAM_BOT_TOKEN");
  const CHAT_ID = getProp_("TELEGRAM_CHAT_ID");
  const TELEGRAM_API_URL = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  // 데이터 추출
  const submissionDate = data.submissionDate || new Date().toLocaleString('ko-KR');
  const contact = data.contact || '';
  const platform = data.platform || '';
  const name = data.name || '이름없음';
  const companyName = data.companyName || '';  // 법인명
  const spaceType = data.spaceType || '';
  const budget = data.budget || '';
  const region = data.region || '';
  const scheduledDate = data.scheduledDate || '';
  const sheetUrl = data.sheetUrl || '';

  // 텔레그램 메시지 포맷
  const message = `
📢 *[토브 법인_신규 시공 문의]*

🏢 *법인 고객 정보*
${companyName ? `• 회사명: ${companyName}` : ''}
• 담당자: ${name}
• 연락처: ${contact}
• 지역: ${region}

📋 *시공 문의 내용*
• 공간 유형: ${spaceType}
• 희망 예산: ${budget}
• 시공 예정일: ${scheduledDate}

ℹ️ *접수 정보*
• 접수일: ${submissionDate}
• 유입 플랫폼: ${platform}
• 구분: *법인 고객*

📝 [스프레드시트 ${row}행 확인](${sheetUrl}#gid=0&range=${row}:${row})
`;

  try {
    // 텔레그램 API 호출
    const response = UrlFetchApp.fetch(TELEGRAM_API_URL, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      })
    });

    const result = JSON.parse(response.getContentText());

    if (result.ok) {
      // 발송 로그 기록 (K열)
      const timestamp = new Date().toLocaleString('ko-KR');
      sheet.getRange(row, 11).setValue(`✅ 발송완료: ${timestamp}`);

      console.log(`[텔레그램-법인] 발송 완료 (${row}행)`);
      return `텔레그램 발송 성공 (${row}행)`;

    } else {
      throw new Error('텔레그램 API 응답 오류');
    }

  } catch (error) {
    // 발송 실패 로그 기록
    sheet.getRange(row, 11).setValue(`❌ 발송실패: ${error.toString()}`);
    console.error(`[텔레그램-법인] 발송 실패 (${row}행):`, error);
    throw error;
  }
}

// ===== 테스트 함수 =====
function testWithMakeFormat() {
  // 메이크에서 보낼 데이터 형식과 동일하게 테스트
  const testData = {
    submissionDate: new Date().toLocaleString('ko-KR'),
    contact: '010-1234-5678',
    platform: '네이버',
    name: '홍길동 팀장',
    companyName: '(주)테스트기업',  // 법인명 추가
    spaceType: '사무실',
    budget: '5000만원',
    region: '서울 강남',
    scheduledDate: '2025-09-01',
    // row: 3, // 특정 행에 업데이트하려면 주석 해제
    // force: true, // 중복 발송 허용하려면 주석 해제
    // sendEmail: false, // 이메일만 발송 안하려면 주석 해제
    // sendTelegram: false, // 텔레그램만 발송 안하려면 주석 해제
  };

  // POST 요청 시뮬레이션 (Query String 포함)
  const e = {
    parameter: {
      secret: getProp_("WEBHOOK_SECRET")  // Query String으로 전달
    },
    postData: {
      contents: JSON.stringify(testData)
    }
  };

  const result = doPost(e);
  console.log('테스트 결과:', result.getContent());
}

// ===== 간단한 발송 테스트 =====
function simpleTest() {
  try {
    // 1. 이메일 테스트
    MailApp.sendEmail({
      to: "2001p@naver.com",
      subject: "[법인] 테스트 이메일",
      body: "법인 Apps Script에서 발송 테스트"
    });
    console.log("이메일 발송 성공");

    // 2. 텔레그램 테스트
    const BOT_TOKEN = getProp_("TELEGRAM_BOT_TOKEN");
    const CHAT_ID = getProp_("TELEGRAM_CHAT_ID");
    const TELEGRAM_API_URL = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    const response = UrlFetchApp.fetch(TELEGRAM_API_URL, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        chat_id: CHAT_ID,
        text: "[법인] Apps Script 텔레그램 테스트",
        parse_mode: 'Markdown'
      })
    });

    console.log("텔레그램 응답:", response.getContentText());

    // 3. 스프레드시트 테스트
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("고객정보");
    if (sheet) {
      console.log("시트 찾음, 마지막 행:", sheet.getLastRow());
    } else {
      console.log("고객정보 시트를 찾을 수 없음");
    }

  } catch (error) {
    console.error("테스트 중 오류:", error);
  }
}

// ===== 시크릿 키 검증 테스트 =====
function testSecretValidation() {
  // 잘못된 시크릿 키로 테스트
  const wrongData = {
    name: "테스트",
    companyName: "테스트법인"
  };

  const e = {
    parameter: {
      secret: "wrong_key"  // 잘못된 Query String
    },
    postData: {
      contents: JSON.stringify(wrongData)
    }
  };

  const result = doPost(e);
  console.log('잘못된 키 테스트:', result.getContent());

  // 올바른 시크릿 키로 테스트
  const correctData = {
    name: "테스트",
    companyName: "테스트법인"
  };

  const e2 = {
    parameter: {
      secret: getProp_("WEBHOOK_SECRET")  // 올바른 Query String
    },
    postData: {
      contents: JSON.stringify(correctData)
    }
  };

  const result2 = doPost(e2);
  console.log('올바른 키 테스트:', result2.getContent());
}

// ===== 수동 재발송 함수 =====
function resendNotification(rowNumber) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("고객정보");

  if (!sheet) {
    console.log("고객정보 시트를 찾을 수 없습니다.");
    return;
  }

  // 기존 데이터 읽기
  const data = {
    submissionDate: sheet.getRange(rowNumber, 1).getDisplayValue(),
    contact: sheet.getRange(rowNumber, 2).getValue(),
    platform: sheet.getRange(rowNumber, 3).getValue(),
    name: sheet.getRange(rowNumber, 4).getValue(),
    spaceType: sheet.getRange(rowNumber, 5).getValue(),
    budget: sheet.getRange(rowNumber, 6).getValue(),
    region: sheet.getRange(rowNumber, 7).getValue(),
    scheduledDate: sheet.getRange(rowNumber, 8).getDisplayValue(),
    companyName: sheet.getRange(rowNumber, 9).getValue(), // 법인명 (있다면)
    sheetUrl: SpreadsheetApp.getActiveSpreadsheet().getUrl()
  };

  // 로그 초기화 (재발송을 위해)
  sheet.getRange(rowNumber, 10).setValue(''); // J열 초기화
  sheet.getRange(rowNumber, 11).setValue(''); // K열 초기화

  try {
    sendEmail(data, sheet, rowNumber);
    sendTelegram(data, sheet, rowNumber);
    console.log(`${rowNumber}행 재발송 완료`);
  } catch (error) {
    console.error(`${rowNumber}행 재발송 실패:`, error);
  }
}

// ===== 발송 상태 확인 함수 =====
function checkStatus() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("고객정보");
  const lastRow = sheet.getLastRow();

  let emailSent = 0;
  let telegramSent = 0;
  let notSent = 0;

  for (let i = 2; i <= lastRow; i++) {
    const emailLog = sheet.getRange(i, 10).getValue();
    const telegramLog = sheet.getRange(i, 11).getValue();

    if (emailLog && emailLog.includes('발송완료')) emailSent++;
    if (telegramLog && telegramLog.includes('발송완료')) telegramSent++;
    if (!emailLog && !telegramLog) notSent++;
  }

  console.log(`
    === 법인 발송 상태 ===
    총 데이터: ${lastRow - 1}행
    이메일 발송: ${emailSent}건
    텔레그램 발송: ${telegramSent}건
    미발송: ${notSent}건
  `);
}
