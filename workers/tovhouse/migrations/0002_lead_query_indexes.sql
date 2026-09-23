-- 관리자 접수 목록 keyset 순서와 정규화 연락처 집계에 맞춘 인덱스.
CREATE INDEX IF NOT EXISTS idx_leads_created_id ON leads(createdAt DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_leads_phone_normalized ON leads(
  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(phone,''),'-',''),' ',''),'+',''),'(',''),')','')
);
