# Supabase Setup Guide

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note your **Project URL** and **anon (public) key** from Settings → API.

## 2. Configure Environment

Copy `.env.example` to `.env` and fill in the values:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key
```

## 3. Run the Migration

1. Open the **SQL Editor** in your Supabase dashboard.
2. Paste the contents of `supabase/migrations/001_initial_schema.sql`.
3. Click **Run**.

## 4. Create the Storage Bucket

1. Go to **Storage** in the Supabase dashboard.
2. Click **New Bucket**.
3. Name it `hubcore-media`.
4. Toggle **Public bucket** ON.
5. Click **Create**.
6. Go back to the **SQL Editor** and run the storage policies from the bottom of the migration file (the commented-out section).

## 5. Seed the Database

1. Open the **SQL Editor**.
2. Paste the contents of `supabase/seed.sql`.
3. Click **Run**.

## 6. Create the First Admin User

1. Go to **Authentication → Users** in the Supabase dashboard.
2. Click **Add User → Create New User**.
3. Enter your email and password.
4. After the user is created, go to the **SQL Editor** and run:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

This is the only way to grant admin access. New registrations always receive the `unauthorized` role and cannot access the administration area until explicitly promoted by SQL.

## 7. Verify

1. Run `npm run dev` in the HubCore project.
2. Navigate to `http://localhost:3030/admin/` to access the CMS.
3. Log in with the admin credentials you created.
