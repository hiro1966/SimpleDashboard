-- 診療科マスタ
CREATE TABLE IF NOT EXISTS ka_master (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ka_name TEXT NOT NULL,
    ka_code INTEGER NOT NULL UNIQUE,
    seq INTEGER NOT NULL,
    valid BOOLEAN NOT NULL DEFAULT 1
);

-- 病棟マスタ
CREATE TABLE IF NOT EXISTS ward_master (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ward_name TEXT NOT NULL,
    ward_code INTEGER NOT NULL UNIQUE,
    seq INTEGER NOT NULL,
    bed_count INTEGER NOT NULL,
    valid BOOLEAN NOT NULL DEFAULT 1
);

-- 外来データ（日次）
CREATE TABLE IF NOT EXISTS outpatient_daily (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,  -- YYYY-MM-DD形式
    ka_code INTEGER NOT NULL,
    first_visit_count INTEGER NOT NULL DEFAULT 0,  -- 初診
    revisit_count INTEGER NOT NULL DEFAULT 0,      -- 再診
    FOREIGN KEY (ka_code) REFERENCES ka_master(ka_code)
);

-- 入院データ（日次）
CREATE TABLE IF NOT EXISTS inpatient_daily (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,  -- YYYY-MM-DD形式
    ward_code INTEGER NOT NULL,
    patient_count INTEGER NOT NULL DEFAULT 0,  -- 入院患者数
    FOREIGN KEY (ward_code) REFERENCES ward_master(ward_code)
);

-- 算定種データ（日次）
CREATE TABLE IF NOT EXISTS billing_daily (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,  -- YYYY-MM-DD形式
    billing_type TEXT NOT NULL,  -- 算定種別名
    count INTEGER NOT NULL DEFAULT 0  -- 件数
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_outpatient_date ON outpatient_daily(date);
CREATE INDEX IF NOT EXISTS idx_outpatient_ka_code ON outpatient_daily(ka_code);
CREATE INDEX IF NOT EXISTS idx_inpatient_date ON inpatient_daily(date);
CREATE INDEX IF NOT EXISTS idx_inpatient_ward_code ON inpatient_daily(ward_code);
CREATE INDEX IF NOT EXISTS idx_billing_date ON billing_daily(date);
CREATE INDEX IF NOT EXISTS idx_billing_type ON billing_daily(billing_type);
