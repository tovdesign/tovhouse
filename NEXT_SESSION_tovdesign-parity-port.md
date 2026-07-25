# NEXT SESSION: tovdesign(34) 개선사항 tovhouse(35) 이식

**작성일**: 2026-07-25
**출처 프로젝트**: `F:\pola_homepage\34.tov2026` / `34.tov2026-admin`
**대상 프로젝트**: `F:\pola_homepage\35.tovhouse2026` / `35.tovhouse2026-admin`

2026-07-25에 tovdesign에 적용한 작업을 tovhouse에 동일 적용하기 위한 문서.
아래 "현황 실측"은 추정이 아니라 **2026-07-25 tovhouse 코드를 직접 확인한 결과**다.

---

## 진행 상황 (2026-07-25 업데이트)

| 항목 | 상태 | 비고 |
| --- | --- | --- |
| §1 토큰 위조 | ✅ 완료·배포 | admin 커밋 `dd97ca6`. 프로덕션 검증 27/27 |
| §2 meta-webhook | ✅ 완료·배포 | 살아있는 호출자 0건 확인 후 강제 인증 |
| §3 internal-notify | ✅ 완료·배포 | 실제로 **무인증 통과 상태였음**(아래 참조) |
| §4 로그인 | 🟡 부분 | 아이디/비번(scrypt) 교체 완료. **실패 카운터만 인스턴스 로컬**(§0 결정 대기) |
| §5 접수폼 | 🟡 부분 | CT/허니팟/타임스탬프 완료. **rate limit은 §0 결정 대기** |
| §6 그래프 | ✅ 완료·배포 | 실측: 730일 구코드 합계 0 → 신코드 167(=totals.users) |
| §7 Meta 폴링 | ⬜ 미착수 | 독립 작업 |
| §9 /api/track | ⬜ 미판단 | 제거 여부 미결 |

### 작업 중 확인된 사실 (문서 기재와 다른 부분)

- **§3 정정** — tovhouse `internal-notify.js`에 인증 코드가 "아예 없다"고 적혀 있었으나,
  실제로는 `X-Notify-Key` 검사가 있었다. 다만 `INTERNAL_NOTIFY_KEY`가 Vercel에 등록돼 있지
  않아 `undefined !== undefined` → false 로 **무인증 요청이 그대로 통과**했다.
  결과적으로 문서 판단(무인증)이 맞았고, 원인이 달랐을 뿐이다.
- **§2 선행 확인 결과** — Airtable 리드 293건이 전량 `source=토브법인`이고 Meta 유래 레코드는
  0건. CF Worker에도 `INTERNAL_NOTIFY_KEY`가 없어 워커의 내부메일 경로는 휴면 상태다.
  admin `/api/meta-webhook`은 **살아있는 호출자가 없어** 잠가도 유실이 없다(삭제는 보류).
- **추가 노출 1건** — `portfolio.js`의 `adminMode`도 같은 `verifyToken`을 쓰고 있어서
  위조 토큰으로 **비공개 포트폴리오 항목 + 시공사 이름/연락처**가 조회 가능했다. §1과 함께 차단됨.
- **GA4 수집 시작일 = 2026-03-27** (121일 전). "전체"는 tovdesign과 동일하게 730일로 두면 된다.
  단 데이터가 있는 날이 121일 중 53일뿐이라 긴 기간 그래프는 듬성듬성하다.
  (GA4가 값 없는 날은 행 자체를 안 준다. 0 채우기는 미적용)
- **로컬 `.env` 드리프트** — `AIRTABLE_TABLE_ID`가 필드 하나(`Name`)뿐인 빈 테이블
  `tbl7PmkHDwQByqCdm`을 가리킨다. 실제 리드는 `tblUEW1jUQRlTzD1I`. Vercel 프로덕션 값은
  정상이라(=`/api/leads` 293건 반환) 운영 영향은 없으나, 로컬 실행 시 오해를 부른다.

### 새 환경변수 (Vercel admin 프로젝트 + 로컬 `.env` 등록 완료)

`ADMIN_USERNAME` · `ADMIN_PASSWORD_HASH`(scrypt, `:` 구분자) · `ADMIN_SESSION_SECRET` ·
`WORKER_SHARED_SECRET`

> `WORKER_SHARED_SECRET`은 admin 라우트 전용으로 새로 발급한 값이다.
> CF Worker의 동명 시크릿과는 **다른 값**이며, 현재 admin 두 라우트를 호출하는 워커 경로가
> 없어 동기화가 필요 없다. 나중에 워커가 이 라우트를 부르게 되면 같은 값으로 맞출 것.

---

## 0. 시작 전 반드시 알아야 할 전제

### 데이터 계층이 다르다 (가장 중요)

| | tovdesign(34) | tovhouse(35) |
| --- | --- | --- |
| leads/portfolio/popups | **D1** (2026-04-28 마이그 완료) | **Airtable** |
| admin `api/_lib/d1.js` | 있음 | **없음** |

tovdesign의 구현 3가지는 D1 SQL에 직접 의존한다. **그대로 복사하면 동작하지 않는다.**

- 로그인 실패 카운터 (`admin_login_attempts` 테이블)
- 접수폼 rate limit (`rate_limit` 테이블, 원자적 UPSERT)
- 접수관리 페이지네이션·집계 (`?stats=1`, `LIMIT/OFFSET`, 윈도우 서브쿼리)

**선택지 2개 중 하나를 먼저 정할 것.**

- **(A) tovhouse도 D1으로 먼저 마이그** — 이후 tovdesign 코드를 거의 그대로 이식.
  tovdesign 마이그 기록: `34.tov2026-admin/NEXT_SESSION_airtable-d1-followup.md`
- **(B) Airtable 유지** — 카운터/rate limit은 Airtable 테이블 또는 CF KV로 대체 구현.
  페이지네이션은 Airtable `pageSize`/`offset` 사용. 코드 재작성 필요.

> 권장: **(A)**. tovdesign에서 이미 검증된 경로이고, Airtable은 200~500ms 지연 + 한도 문제가 있다.
> 단 마이그는 독립 작업이므로 별도 세션으로 잡을 것.

### 데이터 계층과 무관하게 바로 적용 가능한 것

아래 4개는 Airtable/D1 상관없이 그대로 이식 가능하다. **먼저 이것부터 처리하는 걸 권장.**

- 토큰 위조 취약점 (§1)
- admin `/api/meta-webhook` 무인증 (§2)
- `internal-notify` 무인증 (§3)
- 방문자 그래프 버그 + 전체 기간 (§6)

---

## 1. 토큰 위조 취약점 — 최우선 (심각)

### 현황 (tovhouse 실측: 해당됨)

`api/analytics.js:9`, `leads.js:13`, `ocr.js:8`, `popups.js:6`, `portfolio.js:8`, `upload.js:12`
6개 라우트가 동일한 코드를 갖고 있다.

```js
const payload = JSON.parse(Buffer.from(auth.split(" ")[1], "base64").toString());
if (Date.now() - payload.ts > 7 * 24 * 60 * 60 * 1000) return false;
return true;   // ← 서명 검증이 없다
```

서명을 확인하지 않으므로 아래 한 줄로 관리자 API 전체(고객 개인정보 조회·DELETE 포함)에 접근할 수 있다.

```js
btoa(JSON.stringify({ ts: Date.now() }))
```

프론트도 `sessionStorage`에 값이 있기만 하면 서버 확인 없이 화면을 연다.

### 이식 방법

1. `34.tov2026-admin/api/_lib/auth.js`를 그대로 복사 (D1 의존 없음)
   - HMAC-SHA256 서명 토큰, timing-safe 비교
   - 세션은 `HttpOnly; Secure; SameSite=Strict` 쿠키. Domain 생략(호스트 한정)
2. 6개 라우트의 `verifyToken` 본문을 `return isAuthed(req);` 로 교체하고 상단에
   `const { isAuthed } = require("./_lib/auth");` 추가
3. 프론트 `index.html`
   - `API.headers()`에서 `Authorization` 제거 (동일 출처라 쿠키 자동 전송)
   - `DOMContentLoaded`에서 `sessionStorage` 검사 대신
     `POST /api/admin-auth {action:"session"}` 응답으로 판단
4. `ADMIN_SESSION_SECRET` 생성 후 `.env` + Vercel env 등록

**참고 커밋**: tovdesign-admin `7528c21`

---

## 2. admin `/api/meta-webhook` 무인증 공개 write

### 현황 (tovhouse 실측: 해당됨)

`api/meta-webhook.js`가 `Access-Control-Allow-Origin: *` 에 인증이 전혀 없다.
누구나 POST 한 번으로 리드를 생성하고 텔레그램을 발송할 수 있다.
사용자 입력을 `parse_mode: "Markdown"`에 이스케이프 없이 넣는 문제도 같이 있다.

### 이식 방법

`WORKER_SHARED_SECRET` **강제** 검증 + CORS `*` 제거 + Content-Type 검증.

```js
const expected = process.env.WORKER_SHARED_SECRET;
if (!expected) return res.status(500).json({ error: "server_not_configured" });
const got = (req.headers["authorization"] || "").replace(/^Bearer\s+/i, "");
if (!got || !timingSafeEqual_(got, expected)) return res.status(401).json({ error: "unauthorized" });
```

> **조건부 인증(`if (expected) { ... }`) 금지.** env가 빠지면 라우트가 조용히 열린다.
> 시크릿이 없으면 500으로 죽는 게 맞다.

**선행 확인**: tovhouse의 Meta 리드가 이 라우트로 들어오는지, 워커
(`workers/tovhouse/src/index.js`)로 들어오는지 먼저 확인할 것. Make 시나리오
설정을 봐야 한다. 호출처가 없으면 라우트 삭제가 더 깔끔하다.

**참고 커밋**: tovdesign-admin `7528c21`

---

## 3. `internal-notify` 인증 — tovhouse가 더 나쁨

### 현황 (tovhouse 실측)

tovdesign은 조건부 인증(`if (expected)`)이라도 있었는데,
**tovhouse `api/internal-notify.js`에는 인증 코드가 아예 없다.**
(`WORKER_SHARED_SECRET`, `authorization`, `401` 모두 미검출)

### 이식 방법

§2와 동일한 강제 검증 블록을 넣는다. `WORKER_SHARED_SECRET`를
Vercel env + 워커 secret 양쪽에 동일 값으로 등록.

> `wrangler secret put`은 반드시 `printf "%s" "값" | wrangler secret put NAME`.
> `echo`는 끝에 `\n`이 붙어 timing-safe 비교가 깨진다.

---

## 4. 관리자 인증 OTP → 아이디/비밀번호

### 현황 (tovhouse 실측: 해당됨)

`api/admin-auth.js`가 `otpStore = new Map()` + `send-code` 방식.
서버리스는 인스턴스가 매 요청 갈릴 수 있어 in-memory 저장은 신뢰할 수 없다.

### 이식 방법

`34.tov2026-admin/api/admin-auth.js` 참조. 요구사항 3가지:

1. **힌트 금지** — 아이디 오류/비번 오류/차단 상태를 구분해 알리지 않는다.
   실패는 언제나 동일한 401 + 동일 문구
2. **조용한 차단** — N회 실패 시 차단하되 "차단됨"을 알리지 않는다.
   차단 중에도 비밀번호 검증은 그대로 수행한다(응답 시간으로 유추 방지)
3. **비밀번호는 scrypt 해시로만 저장**, 평문 금지

로그인 화면에서 아이디 입력창의 `value`/`placeholder`/자동완성 힌트를 제거할 것.

### ⚠️ Airtable 유지 시 주의

실패 카운터 저장소가 필요하다. D1이 없으면:
- Airtable 전용 테이블, 또는
- **CF Workers KV** (권장 — 지연 낮고 TTL 지원)

`.env` 해시 형식은 **`$` 구분자를 쓰지 말 것** → §7 참조.

**참고 커밋**: tovdesign-admin `7528c21`

---

## 5. 공개 접수폼 방어 — tovhouse가 훨씬 약함

### 현황 (tovhouse 실측)

`api/submit.js` 방어 현황:

| 계층 | tovdesign | tovhouse |
| --- | --- | --- |
| Content-Type 415 검증 | 있음 | **없음** |
| 허니팟 `_hp` | 있음 | **없음** |
| 타임스탬프 `_ts` (3초) | 있음 | **없음** |
| IP rate limit | 있음(10회/시간) | **없음** |

메인 사이트 `estimate.html`이 `api/submit`으로 직접 제출한다.
**SMS(NCP SENS)가 건당 과금이라 여기가 뚫리면 금전 피해로 직결된다.**

### 이식 방법

1. Content-Type 검증 + 허니팟 + 타임스탬프는 `34.tov2026-admin/api/submit.js`
   상단 검증 블록을 그대로 이식 (프론트에 `_hp` hidden input과
   `window._formLoadTs` 추가 필요)
2. rate limit은 `34.tov2026-admin/api/_lib/ratelimit.js` 참조

rate limit 핵심 2가지:

- **원자적 증가** — 읽고 나서 쓰면 동시 요청이 한도를 넘는다.
  D1은 `INSERT ... ON CONFLICT DO UPDATE ... RETURNING count` 한 방으로 처리
- **fail-open** — 저장소 장애 시 접수를 막지 않는다.
  실제 문의 유실이 스팸 통과보다 손해가 크다
- 차단 위치는 **R2 업로드/저장/발송보다 앞**. 알림은 초과 첫 건에서만

**참고 커밋**: tovdesign-admin `42ee17f`

---

## 6. 방문자 그래프 버그 + 전체 기간 (바로 적용 가능)

### 현황 (tovhouse 실측: 해당됨)

`35.tovhouse2026-admin/index.html:4636, 4640`

```js
labels: daily.map((d) => d.date.slice(5)),          // '20260718' → '718'
data:   daily.map((d) => d.count || d.visitors || 0) // 해당 필드 없음 → 항상 0
```

GA4 Data API는 날짜를 `YYYYMMDD`, 방문자 수를 `users`로 반환한다.
그래서 **x축 라벨이 깨진 채 y=0 평평한 선**만 그려진다.
(`sources`/`devices`/`pages`/`regions`는 필드명이 맞아 정상)

기간 버튼도 `1 / 7 / 14 / 30`만 있고 90일·전체가 없다.

### 이식 방법

```js
function fmtDayLabel(raw) {
  const s = String(raw || "");
  if (/^\d{8}$/.test(s)) return `${s.slice(4, 6)}-${s.slice(6, 8)}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.slice(5);
  return s;
}
// labels: daily.map(d => fmtDayLabel(d.date))
// data:   daily.map(d => Number(d.users ?? d.count ?? d.visitors ?? 0) || 0)
```

- 기간이 길면 라벨이 겹치므로 `autoSkip: true` + `maxTicksLimit`,
  포인트 40개 초과 시 `pointRadius: 0` (`pointHitRadius`는 유지)
- 기간 버튼에 `90일`, `전체(730일)` 추가

**tovhouse GA4 수집 시작일을 먼저 확인**하고 "전체" 값을 정할 것.
tovdesign은 2026-03-26 시작이라 730일이 곧 전 구간이었다.

**참고 커밋**: tovdesign-admin `2fb298e`

---

## 7. Meta 리드 자체 폴링 (Make 대체)

### 현황

tovdesign은 Make 시나리오를 끄고 **CF Worker Cron(매시 정각)** 으로 전환했다.
tovhouse도 `workers/tovhouse/` 가 있으므로 동일 구조 적용 가능.

### 선행 확인 사항

1. tovhouse Meta 리드가 현재 어떤 경로로 들어오는가 (Make? 직접 웹훅?)
2. Meta 시스템 사용자 토큰이 tovhouse 페이지/폼에 접근 권한이 있는가
   - `leads_retrieval` + `pages_show_list` 스코프 필요
   - `/me/accounts`로 페이지 목록 확인 → 페이지 토큰 획득
   - `/{page-id}/leadgen_forms` 는 **페이지 토큰 필수** (시스템 사용자 토큰으로는 `(#190)` 에러)
3. tovhouse 리드 저장소가 Airtable이면 폴러의 INSERT 부분을 Airtable API로 교체

### 구현 요점 (`34.tov2026/workers/tovdesign/src/index.js` 참조)

- `scheduled()` 핸들러 + `wrangler.toml`에 `[triggers] crons = ["0 * * * *"]`
- 폼 선별: `ACTIVE` && `leads_count > 0` → 신규 폼도 첫 리드 발생 시 자동 편입
- **Meta가 `filtering` 파라미터를 무시하는 경우가 있다.** 클라이언트 측 시간 컷이
  실제 기준이고, 최신순 결과에서 `sinceMs`보다 오래된 건이 나오면 조기 종료
- 중복 차단 2중
  1. `metaLeadId` UNIQUE — 폴러 자기 재조회 구간 겹침 방지
  2. 전환기 흡수 — Make가 이미 넣은 행을 연락처+시각으로 claim (알림 재발송 방지)
- **전화번호 정규화 필수** — Meta는 프로필 자동채움 시 `+8210…`(E.164)로 준다.
  정규화하지 않으면 한국 휴대폰 정규식에서 조용히 스킵돼 SMS가 안 나간다.
  tovdesign 실측: 204건 중 23건(11%)만 발송되고 있었다
- cutover 시각(`META_LEAD_CUTOVER_AT`)을 마지막 처리분 직후로 잡으면
  Make를 언제 꺼도 그 사이 리드를 놓치지 않는다
- 폴링 결과를 텔레그램 인프라 채널에 리포트 (신규 건수 + 리드별 SMS 발송 여부)

**참고 커밋**: tovdesign(frontend) `6161de8`

---

## 8. 해당 없음 (tovhouse는 이미 정상)

- **견적문의 헤더** — tovdesign은 `estimate.html`만 메뉴가 빠지고 "메인으로"
  링크로 대체돼 있었다. tovhouse는 `estimate.html:1053`에 이미
  `nav-links` 5개 + `nav-cta`가 있어 조치 불필요.

## 9. 확인 필요 (판단 후 결정)

- **`/api/track`** — tovhouse 프론트에서 호출하는 곳이 없다(검색 결과 0건).
  tovdesign에서는 인증 없이 D1 write가 가능한 죽은 엔드포인트라 제거했다.
  tovhouse도 통계를 GA4로 보고 있다면 동일하게 제거 검토.
  **단, tovhouse가 자체 방문자 데이터를 실제로 쓰고 있는지 먼저 확인할 것.**

---

## 권장 적용 순서

1. **§1 토큰 위조** — 가장 심각. 데이터 계층 무관, 즉시 가능
2. **§2·§3 무인증 라우트** — 즉시 가능
3. **§6 그래프 버그** — 즉시 가능, 리스크 낮음
4. **§5 접수폼 방어** — 허니팟/타임스탬프/CT 검증까지는 즉시 가능,
   rate limit은 저장소 결정 후
5. **§0 D1 마이그 여부 결정** → 결정 후 §4 로그인, §5 rate limit,
   접수관리 페이지네이션
6. **§7 Meta 폴링** — 독립 작업. Make 현황 파악이 선행

---

## 검증 방법 (tovdesign에서 실제로 쓴 것)

### 인증 경계

```bash
# 위조 토큰이 막히는지
FAKE=$(node -e "console.log(Buffer.from(JSON.stringify({ts:Date.now()})).toString('base64'))")
curl -s -o /dev/null -w "%{http_code}\n" "$ADMIN/api/leads" -H "Authorization: Bearer $FAKE"   # 401 기대

# 무인증
curl -s -o /dev/null -w "%{http_code}\n" "$ADMIN/api/leads"                                     # 401 기대
```

### 로그인 힌트 노출

없는 아이디와 맞는 아이디+틀린 비번의 **응답 본문이 동일**해야 한다.

### rate limit (발송 없이 확인하는 법)

정상 페이로드를 10번 보내면 실제 접수·SMS가 나간다. 대신:

1. 저장소에 해당 IP 카운터를 미리 한도 초과값(예: 999)으로 시딩
2. 요청 1건 발사 → **429가 저장·발송 전에 끊는지** 확인
3. 리드 수가 그대로인지 확인 후 시딩한 카운터 삭제

> 안전장치: 만에 하나 차단이 안 될 때를 대비해 **휴대폰 정규식에 안 걸리는
> 일반전화 형식**(예: `0212345678`)을 쓰면 SMS 과금 가능성이 0이 된다.

### 그래프

헤드리스 브라우저로 로그인 후 `Chart.getChart(canvas)`로 실제 데이터셋을 읽어
API `totals.users` 합계와 일치하는지 대조한다.
(`let` 선언이라 `window.visitorsChart`로는 접근되지 않는다)

---

## 함정 (실제로 밟은 것들)

### `.env` 값에 `$`를 넣지 말 것

`set -a && . ./.env` 로 읽으면 값 안의 `$1`, `$8` 등이 **위치 인자로 치환**되어
값이 조용히 손상된다. 에러가 안 나서 원인 추적이 오래 걸린다.

- 실제 사고: scrypt 해시를 `scrypt$16384$8$1$salt$hash` 형식으로 만들었더니
  Vercel에 깨진 값이 올라가 로그인이 계속 401
- 해결: 구분자를 `:`로 (`scrypt:N:r:p:salt:hash`)
- env를 외부 API로 넘길 때는 셸 source 대신 **파일 직접 파싱**

### Vercel env 등록

`vercel env` CLI는 멀티프로젝트 환경에서 cwd 관련 버그가 있다.
**Vercel REST API 직접 호출**을 권장 (`/v9/projects/{id}/env`, `/v10/...`).

### `curl -I`로 API 헤더 확인 금지

HEAD 요청이라 `req.method === "GET"` 분기를 타지 않는다.
`curl -s -D- -o /dev/null` 로 GET 헤더를 봐야 한다.

### Windows에서 `&`가 들어간 URL

`execSync`는 `cmd.exe`를 거쳐 `&`가 명령 구분자로 해석된다.
node 내부 `fetch`를 쓰거나 URL을 따옴표로 감쌀 것.

### 테스트 발송 금지

이메일/SMS/폼 정상 페이로드 테스트 발송을 임의로 실행하지 않는다.
보안 검증은 **401/415/400 분기 차단까지만** 확인한다.

---

## 참조

- tovdesign 커밋 (2026-07-25)
  - frontend `6161de8` Meta 자체 폴링, `edb5079` 견적 헤더
  - admin `7528c21` 인증 교체+취약점, `07b7ade` track 제거,
    `42ee17f` rate limit, `4ca8802` 페이지네이션, `2fb298e` 그래프
- tovdesign D1 마이그 기록: `34.tov2026-admin/NEXT_SESSION_airtable-d1-followup.md`
- 공통 규칙 SSoT: `F:\agents-rules\global\` (security.md, form-security.md, web-architecture.md)
