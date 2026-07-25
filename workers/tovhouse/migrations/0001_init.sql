-- tovhouse D1 초기 스키마
--
-- tovdesign(34) D1 스키마를 기준으로 하되 tovhouse Airtable에만 있는 컬럼
-- (portfolio.type / portfolio.status)을 추가했다.
--
-- airtable_id 를 보존하는 이유: 기존 외부 링크·admin UI가 Airtable record id
-- (rec...)를 그대로 쓰고 있어서, 이 값을 유지해야 응답 호환성이 100% 유지된다.
-- (tovdesign 마이그에서 검증된 방식)

CREATE TABLE IF NOT EXISTS portfolio (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  airtable_id      TEXT UNIQUE,
  title            TEXT NOT NULL,
  category         TEXT NOT NULL,
  subcategory      TEXT,
  type             TEXT,
  status           TEXT,
  thumbnail        TEXT,
  images           TEXT,                   -- 개행 구분 문자열 (admin 코드와 동일)
  description      TEXT,
  content          TEXT,
  blocks           TEXT,
  receipt_image    TEXT,
  receipt_data     TEXT,
  region           TEXT,
  spaceType        TEXT,
  area             TEXT,
  duration         TEXT,
  cost             TEXT,
  contractor_name  TEXT,
  contractor_phone TEXT,
  sortOrder        INTEGER DEFAULT 0,
  visible          INTEGER DEFAULT 1,
  createdAt        TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt        TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leads (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  airtable_id     TEXT UNIQUE,
  name            TEXT,
  phone           TEXT,
  email           TEXT,
  interiorType    TEXT,
  budget          TEXT,
  area            TEXT,
  address         TEXT,
  schedule        TEXT,
  message         TEXT,
  status          TEXT DEFAULT '대기',
  memo            TEXT,                   -- JSON 문자열 (threads)
  platform        TEXT,                   -- 'web', 'ig', 'fb'
  source          TEXT,                   -- 'homepage', 'meta', '토브법인'
  ip              TEXT,
  photos          TEXT,                   -- JSON 배열 (R2 URL)
  privacyConsent  INTEGER DEFAULT 0,
  metaLeadId      TEXT UNIQUE,            -- Meta 폴러 중복 차단
  createdAt       TEXT,                   -- KST ISO 문자열
  updatedAt       TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leads_createdAt ON leads (createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads (phone);
CREATE INDEX IF NOT EXISTS idx_portfolio_sort ON portfolio (visible, sortOrder);

CREATE TABLE IF NOT EXISTS popups (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  airtable_id  TEXT UNIQUE,
  title        TEXT NOT NULL,
  imageUrl     TEXT,
  linkUrl      TEXT,
  active       INTEGER DEFAULT 1,
  startDate    TEXT,
  endDate      TEXT,
  createdAt    TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt    TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS visitors (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  airtable_id  TEXT UNIQUE,
  date         TEXT NOT NULL,
  ipHash       TEXT NOT NULL,
  city         TEXT,
  district     TEXT,
  region       TEXT,
  page         TEXT,
  device       TEXT,
  referrer     TEXT,
  createdAt    TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (date, ipHash)
);

-- Meta 리드 폴러 상태 (마지막 처리 시각 등)
CREATE TABLE IF NOT EXISTS poller_state (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updatedAt  TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 관리자 로그인 실패 카운터 (현재 admin-auth.js는 인스턴스 로컬 메모리를 쓴다.
-- D1 전환 후 getAttempt/recordFail/clearFails 본문만 이 테이블로 교체)
CREATE TABLE IF NOT EXISTS admin_login_attempts (
  ip            TEXT PRIMARY KEY,
  fails         INTEGER DEFAULT 0,
  firstFailAt   TEXT,
  lastFailAt    TEXT,
  blockedUntil  TEXT
);

-- 공개 엔드포인트 rate limit (원자적 UPSERT용)
CREATE TABLE IF NOT EXISTS rate_limit (
  bucket       TEXT PRIMARY KEY,   -- 예: 'submit:1.2.3.4'
  count        INTEGER DEFAULT 0,
  windowStart  TEXT
);
