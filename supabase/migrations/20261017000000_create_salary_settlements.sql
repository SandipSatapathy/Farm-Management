-- =============================================================================
-- Migration: Create salary_settlements table for FarmLog
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.salary_settlements (
    id VARCHAR(64) PRIMARY KEY,
    farm_id VARCHAR(64) NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    labourer_id VARCHAR(64) NOT NULL REFERENCES labourers(id) ON DELETE CASCADE,
    labourer_name VARCHAR(255),
    labour_code VARCHAR(50),
    period_type VARCHAR(30) DEFAULT 'monthly',
    start_date DATE,
    end_date DATE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    week_number INTEGER,
    days_worked NUMERIC(6, 2) DEFAULT 0,
    daily_rate NUMERIC(10, 2) DEFAULT 0,
    gross_wage NUMERIC(10, 2) DEFAULT 0,
    advance_deducted NUMERIC(10, 2) DEFAULT 0,
    net_payable NUMERIC(10, 2) DEFAULT 0,
    paid_amount NUMERIC(10, 2) NOT NULL,
    given_by VARCHAR(255) DEFAULT 'Owner',
    payment_method VARCHAR(30) DEFAULT 'cash',
    payment_date DATE DEFAULT CURRENT_DATE,
    payment_reference VARCHAR(100),
    notes TEXT,
    status VARCHAR(30) DEFAULT 'settled',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.salary_settlements ENABLE ROW LEVEL SECURITY;

-- Allow authenticated and anon access
DROP POLICY IF EXISTS "Allow all on salary_settlements" ON public.salary_settlements;
CREATE POLICY "Allow all on salary_settlements" ON public.salary_settlements
    FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime for multi-device live sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.salary_settlements;
