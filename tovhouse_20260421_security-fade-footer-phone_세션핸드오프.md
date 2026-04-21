---
title: "tovhouse 세션 핸드오프 2026-04-21"
project: 35.tovhouse2026
date: 2026-04-21
type: session-handoff
tags: [handoff, tovhouse, security, vercel, cloudflare-worker, xss, ux]
---

# 세션 핸드오프 — 2026-04-21 (tovhouse)

## 완료된 작업 (배포됨)

### 1. 시공사례 갤러리 전체 사진 표시 + 내역서 표지 제외

- `portfolio-detail.html:1367` — `images.slice(0, 12)` 제거 → 전체 사진 노출
- `portfolio-data.json` — 55건의 `_01.webp`(실행내역서)를 `detailImages` 배열 맨 뒤로 이동. 감지 알고리즘: 아스펙트 비율(h/w≥1.3) OR (h/w≥1.05 + 밝은 배경 + 낮은 채도 + 수평 엣지 밀도 ≥3)
- **참고**: 내역서는 여전히 갤러리 내 표시되지만 첫 이미지(표지)는 실제 시공사진

### 2. 상세 페이지 "데이터를 불러올 수 없다" 에러 수정

- 원인: `portfolio-detail.html`의 동적 SEO 메타 업데이트 코드가 `og:url` 메타 태그를 찾아 `setAttribute` 호출 → head에 태그 없음 → `null.setAttribute()` TypeError → catch 블록에서 에러 페이지 표시
- 수정: `og:url` 메타 태그 추가 + `setMeta()` 헬퍼로 누락 시 자동 생성
- **Troubleshooting 저장**: `F:\obsidian\Pola\Troubleshooting\css.md` — "동적 메타 태그 setAttribute null 에러" 섹션

### 3. 모바일 fade-in 애니메이션 안 보임 수정

- 원인: `IntersectionObserver` threshold 0.15 + negative rootMargin → 세로로 긴 갤러리 래퍼에서 발동 지연
- 수정: threshold 0 + rootMargin "0px 0px 150~200px 0px" + 1.5초 안전장치 + IO 미지원 폴백
- 대상 파일: `portfolio-detail.html`, `portfolio.html`, `index.html`, `about.html`, `news.html`
- **Troubleshooting 저장**: `F:\obsidian\Pola\Troubleshooting\css.md` — "IntersectionObserver fade-in이 모바일에서 안 보임" 섹션

### 4. 푸터 "청정종합건영(주) 건설업 면허 보유 기업" 전 페이지 삭제

- 8개 HTML 파일에서 제거 (about/estimate/index/news/portfolio/portfolio-detail/privacy/terms)

### 5. 대표 전화번호 교체

- `031-968-2224` → `010-6202-3618` (35건, 9개 파일)
- tel: 링크, display, schema.org telephone 모두 포함
- **주의**: Worker `SENS_SENDER` (NCP SMS 발신번호)는 그대로 유지 — NCP 발신번호 재등록 필요 시 `wrangler secret put SENS_SENDER` 수정

### 6. 보안 개선 8건 + Worker 강제 모드 승격

- 기준 문서: `F:\pola_homepage\34.tov2026\docs\security-audit-handoff.html` (7-패턴 카탈로그)
- 가이드: `F:\pola_homepage\35.tovhouse2026\docs\security-human-actions.html`

| 항목                                                                           | 상태                           |
| ------------------------------------------------------------------------------ | ------------------------------ |
| CRIT-1 `.gs` 평문 시크릿 → PropertiesService                                   | ✅ 코드 (LEGACY — 운영 미사용) |
| CRIT-2 Worker 7-Layer (auth/rate/honeypot/timestamp/validation/error abstract) | ✅ 배포 + **강제 모드**        |
| CRIT-3 CORS 화이트리스트                                                       | ✅ 배포                        |
| HIGH-1 Telegram MarkdownV2 escape                                              | ✅ 배포                        |
| HIGH-2 DOM XSS escape (portfolio/portfolio-detail)                             | ✅ 배포                        |
| MED-1 vercel.json 보안 헤더 5종                                                | ✅ 배포                        |
| MED-2 estimate.html 허니팟 + 타임스탬프                                        | ✅ 배포                        |
| MED-3 Worker 에러 응답 추상화                                                  | ✅ 배포                        |
| **강제 모드 승격** (admin Bearer + Worker WORKER_SHARED_SECRET)                | ✅ 완료                        |

### 7. admin 프로젝트 Worker 인증 연결

- `35.tovhouse2026-admin/api/submit.js` — Worker 호출 시 `Authorization: Bearer $TOVHOUSE_WORKER_SECRET` 헤더 추가
- Vercel env var `TOVHOUSE_WORKER_SECRET` 프로덕션 등록
- Worker `WORKER_SHARED_SECRET` 동일 값으로 등록 → 강제 모드
- **검증 완료**: 인증 없음 → 401, 올바른 토큰 → 통과

## 커밋 로그

### tovhouse (35.tovhouse2026)

- `5eaadaa` 시공사례 갤러리 전체 사진 + 내역서 표지 제외 (Vercel 이메일로 amend)
- `6749dc8` 상세페이지 로딩 에러 수정 + 푸터 청정종합 제거
- `a5f918d` 모바일 fade 애니메이션 안 보이던 문제 수정
- `8e0e88b` 보안 개선 8건 일괄 적용
- `7cf18aa` og:url 동적 업데이트 버그 수정 + 수동 조치 가이드
- `53b931d` 대표 전화번호 교체 010-6202-3618
- `0cb75f8` docs(.gs): LEGACY 주석 추가

### tovhouse-admin (35.tovhouse2026-admin)

- `0a11f2c` feat(submit): Worker 호출 시 Bearer 인증 헤더 추가

### Cloudflare Worker

- Version `6b7d8aa4-ef46-4478-bd91-8486bc75d237` (7-Layer) → 강제 모드 활성

## 유보 (사용자 판단으로 패스)

### 🕒 Telegram Bot Token 회전

- 노출된 토큰: `8053531001:AAHsPDUPGx0PzuqqXJMmveevEWAlVo-Bcjk` (공개 저장소 `docs/tov-*.gs`에 평문)
- 현재 Worker의 `TELEGRAM_BOT_TOKEN` wrangler secret이 동일 값일 가능성 → 노출 상태
- 필요 시: BotFather `/revoke` → 새 토큰 → `npx wrangler secret put TELEGRAM_BOT_TOKEN`

## 운영 구조 (현 상태)

```
사용자 → estimate.html (honeypot + _ts)
      → admin.tovdesign.net/api/submit (Bearer 헤더)
      → Worker /api/send-sms (401 방어벽 + 7-Layer)
      → NCP SENS SMS + Telegram + Airtable

Meta 광고 lead → (Make.com 또는 직접) → admin/api/meta-webhook 또는 Worker/api/meta-webhook
```

- `docs/tov-*-webapp.gs`는 **LEGACY** — 과거 tovdesign(34.tov2026) Make.com+Sheets 연동 참조용. 현 tovhouse 운영엔 미사용
- `portfolio-data.json`은 gitignored (`*.json` rule) — Vercel CLI로 로컬 파일 직접 업로드 방식으로 배포

## 중요 주의사항

1. **Git Author 이메일 = Vercel 계정 이메일 필수**: 이 프로젝트 Vercel은 `2343parksw@gmail.com` 소속. `mkt9834@gmail.com`으로 커밋하면 "Git author must have access to the team" 에러로 배포 실패. 커밋 시 `GIT_AUTHOR_EMAIL=2343parksw@gmail.com GIT_COMMITTER_EMAIL=2343parksw@gmail.com git commit` 필수.
2. **`portfolio-data.json`은 gitignored** — Vercel CLI deploy 필수 (git push로는 안 올라감)
3. **Worker는 현재 강제 모드** — env에 `WORKER_SHARED_SECRET` 있으면 `Authorization: Bearer ...` 없는 요청은 401. admin은 이미 Bearer 헤더 장착.

## 다음 세션 참고 파일

- 보안 가이드: `F:\pola_homepage\35.tovhouse2026\docs\security-human-actions.html`
- Troubleshooting 신규 추가: `F:\obsidian\Pola\Troubleshooting\css.md` (2개 섹션)
- 원본 보안 점검 문서: `F:\pola_homepage\34.tov2026\docs\security-audit-handoff.html`

## Tech Stack 요약

- Frontend: 정적 HTML + Tailwind 없음(순수 CSS) + Pretendard 폰트
- Hosting: Vercel (프로젝트 `prj_G81FSN0NMbwhw7VmLIeGmOxqsxtx`, 팀 `team_DAcNqExHR4P8OCnnNDE2SKPQ`)
- API Backend: `tovhouse-admin` 별도 Vercel 프로젝트 (`prj_w9LMLwp2fJsCXf1uetvgFojAQJVk`)
- SMS 프록시: Cloudflare Worker `tovhouse` at `tovhouse.2343parksw.workers.dev`
- 데이터: Airtable (base `appgpowtz5DSI391U`)
- 알림: Telegram Bot, NCP SENS (SMS)
