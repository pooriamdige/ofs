-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users Table (Local Auth + WP Mapping)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wp_user_id VARCHAR(50) UNIQUE,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  full_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Accounts Table (From Architecture)
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wp_user_id VARCHAR(50) NOT NULL, -- references users.wp_user_id logically
    login VARCHAR(50) NOT NULL,
    server VARCHAR(100) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_wp_user_id ON accounts(wp_user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_login_server ON accounts(login, server);

-- Account Instances Table
CREATE TABLE IF NOT EXISTS account_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    hash_id VARCHAR(255) UNIQUE NOT NULL,
    encrypted_investor_pass TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'deactivated', 'error')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deactivated_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(account_id, hash_id)
);

CREATE INDEX IF NOT EXISTS idx_account_instances_account_id ON account_instances(account_id);

-- Initial Balance Table
CREATE TABLE IF NOT EXISTS initial_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    initial_balance_value DECIMAL(15,2) NOT NULL,
    initial_balance_source VARCHAR(20) NOT NULL CHECK (initial_balance_source IN ('order_meta', 'mt5_deposits', 'manual')),
    initial_balance_set_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source_metadata JSONB,
    UNIQUE(account_id)
);

-- Equity History Table
CREATE TABLE IF NOT EXISTS equity_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_instance_id UUID NOT NULL REFERENCES account_instances(id) ON DELETE CASCADE,
    balance DECIMAL(15,2) NOT NULL,
    equity DECIMAL(15,2) NOT NULL,
    margin DECIMAL(15,2) DEFAULT 0,
    free_margin DECIMAL(15,2) DEFAULT 0,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equity_account_instance_id ON equity_history(account_instance_id);
CREATE INDEX IF NOT EXISTS idx_equity_recorded_at ON equity_history(recorded_at);

-- Rule Violations Table
CREATE TABLE IF NOT EXISTS rule_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_instance_id UUID NOT NULL REFERENCES account_instances(id) ON DELETE CASCADE,
    rule_type VARCHAR(50) NOT NULL,
    threshold_value DECIMAL(15,2) NOT NULL,
    current_value DECIMAL(15,2) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('warning', 'critical', 'breach')),
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_violations_account_instance_id ON rule_violations(account_instance_id);
