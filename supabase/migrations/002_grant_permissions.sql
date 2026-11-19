-- ============================================================
-- HUBCORE CMS — Table Grants for anon and authenticated Roles
-- Enables PostgreSQL table-level access so Row Level Security
-- (RLS) policies can be evaluated for public and admin users.
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- 1. Grant usage on public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 2. Grant read access to public / anonymous visitors (subject to RLS policies)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- 3. Grant full table access to authenticated users (subject to RLS policies)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- 4. Grant sequence access
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 5. Ensure future tables created in schema public inherit these grants
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;
