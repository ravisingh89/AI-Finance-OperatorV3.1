-- Run this in your Supabase SQL Editor after creating the project

-- 1. Create the storage bucket for bank statements
INSERT INTO storage.buckets (id, name, public)
VALUES ('statements', 'statements', false)
ON CONFLICT DO NOTHING;

-- 2. RLS policy: users can only access their own files
CREATE POLICY "User owns their files"
ON storage.objects FOR ALL
USING (auth.uid()::text = (storage.foldername(name))[1]);

-- 3. Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    currency VARCHAR(3) DEFAULT 'AED',
    region VARCHAR(10) DEFAULT 'UAE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Statements
CREATE TABLE IF NOT EXISTS statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement_id UUID NOT NULL,
    user_id UUID NOT NULL,
    date VARCHAR(20) NOT NULL,
    merchant VARCHAR(500),
    amount FLOAT NOT NULL,
    currency VARCHAR(3) NOT NULL,
    type VARCHAR(10) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    category_confidence FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Financial reports
CREATE TABLE IF NOT EXISTS financial_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    statement_id UUID NOT NULL,
    report_data JSONB NOT NULL,
    waste_score INTEGER,
    savings_score INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_tx_user    ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_tx_stmt    ON transactions(statement_id);
CREATE INDEX IF NOT EXISTS idx_rpt_user   ON financial_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_stmt_user  ON statements(user_id);

-- 8. Enable RLS
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE statements         ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_reports  ENABLE ROW LEVEL SECURITY;
