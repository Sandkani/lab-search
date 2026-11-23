-- ตารางรายการตรวจแล็บ
CREATE TABLE IF NOT EXISTS labs (
  id            SERIAL PRIMARY KEY,
  test_name     TEXT NOT NULL,
  specimen_type TEXT DEFAULT '',
  container     TEXT DEFAULT '',
  price         TEXT DEFAULT '',
  tat           TEXT DEFAULT '',
  description   TEXT DEFAULT '',
  category      TEXT DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS labs_test_name_idx ON labs (test_name);
CREATE INDEX IF NOT EXISTS labs_container_idx ON labs (container);
CREATE INDEX IF NOT EXISTS labs_category_idx ON labs (category);

-- บันทึกการใช้งาน (ไม่บังคับ)
CREATE TABLE IF NOT EXISTS usage_logs (
  id         SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  detail     TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
