-- ============================================================
-- HUBCORE CMS — Initial Database Schema
-- PostgreSQL on Supabase · 6 Tables
-- ============================================================

-- ─── EXTENSIONS ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ENUMS ───────────────────────────────────────────────────
-- Single-admin model: only 'admin' has privileges. Any new registration defaults to 'unauthorized'.
CREATE TYPE public.user_role AS ENUM ('admin', 'unauthorized');
CREATE TYPE public.publish_status AS ENUM ('draft', 'published', 'archived');

-- ─── SHARED TRIGGER: auto-update updated_at ──────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 1. PROFILES — Linked to auth.users
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT NOT NULL DEFAULT '',
  role        public.user_role NOT NULL DEFAULT 'unauthorized',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup (always 'unauthorized', never admin).
-- Promotion to 'admin' requires a manual, controlled SQL operation.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    'unauthorized'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Admin-check helper: SECURITY DEFINER bypasses RLS on profiles,
-- pinned search_path prevents injection, execution restricted.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ═══════════════════════════════════════════════════════════════
-- 2. PROJECTS — Works / portfolio pieces
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.projects (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                 TEXT NOT NULL UNIQUE,
  title                TEXT NOT NULL,
  category             TEXT NOT NULL DEFAULT '',
  discipline           TEXT DEFAULT '',
  summary              TEXT DEFAULT '',
  description          TEXT DEFAULT '',
  thumbnail_url        TEXT DEFAULT '',
  hero_image_url       TEXT DEFAULT '',
  hero_video_url       TEXT DEFAULT '',
  grid_layout_variant  TEXT NOT NULL DEFAULT 'medium',
  asset_slot_id        TEXT DEFAULT '',
  year                 TEXT DEFAULT '2026',
  is_featured_home     BOOLEAN NOT NULL DEFAULT FALSE,
  home_slot_index      INT DEFAULT NULL,
  home_sort_order      INT NOT NULL DEFAULT 0,
  works_sort_order     INT NOT NULL DEFAULT 0,
  status               public.publish_status NOT NULL DEFAULT 'draft',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at         TIMESTAMPTZ
);

CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_featured ON public.projects(is_featured_home) WHERE is_featured_home = TRUE;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- 3. JOURNAL POSTS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.journal_posts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  TEXT NOT NULL UNIQUE,
  title                 TEXT NOT NULL,
  excerpt               TEXT DEFAULT '',
  content_html          TEXT NOT NULL DEFAULT '',
  cover_image_url       TEXT DEFAULT '',
  category              TEXT NOT NULL DEFAULT 'Practice',
  reading_time_minutes  INT DEFAULT 4,
  author_id             UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status                public.publish_status NOT NULL DEFAULT 'draft',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at          TIMESTAMPTZ
);

CREATE INDEX idx_journal_status ON public.journal_posts(status);

CREATE TRIGGER journal_posts_updated_at
  BEFORE UPDATE ON public.journal_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- 4. SITE CONFIG — Key-value with draft/publish workflow
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.site_config (
  key          TEXT PRIMARY KEY,
  value        TEXT NOT NULL DEFAULT '',
  draft_value  TEXT DEFAULT NULL,
  value_type   TEXT NOT NULL DEFAULT 'text',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TRIGGER site_config_updated_at
  BEFORE UPDATE ON public.site_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- 5. MEDIA ASSETS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.media_assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename        TEXT NOT NULL,
  storage_path    TEXT NOT NULL UNIQUE,
  public_url      TEXT NOT NULL,
  mime_type       TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  width           INT DEFAULT NULL,
  height          INT DEFAULT NULL,
  alt_text        TEXT DEFAULT '',
  uploaded_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 6. ACTIVITY LOGS — Append-only audit trail
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.activity_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_email      TEXT NOT NULL DEFAULT '',
  action          TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       TEXT DEFAULT NULL,
  details         JSONB DEFAULT '{}'::jsonb,
  previous_value  JSONB DEFAULT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_created ON public.activity_logs(created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════

-- ─── PROFILES ────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ─── PROJECTS ────────────────────────────────────────────────
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published projects"
  ON public.projects FOR SELECT
  TO anon
  USING (status = 'published');

CREATE POLICY "Authenticated can view published projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING (status = 'published');

CREATE POLICY "Admins have full read access to projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert projects"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update projects"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete projects"
  ON public.projects FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ─── JOURNAL POSTS ───────────────────────────────────────────
ALTER TABLE public.journal_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published journal posts"
  ON public.journal_posts FOR SELECT
  TO anon
  USING (status = 'published');

CREATE POLICY "Authenticated can view published journal posts"
  ON public.journal_posts FOR SELECT
  TO authenticated
  USING (status = 'published');

CREATE POLICY "Admins have full read access to journal posts"
  ON public.journal_posts FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert journal posts"
  ON public.journal_posts FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update journal posts"
  ON public.journal_posts FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete journal posts"
  ON public.journal_posts FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ─── SITE CONFIG ─────────────────────────────────────────────
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read site config"
  ON public.site_config FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated can read site config"
  ON public.site_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update site config"
  ON public.site_config FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can insert site config"
  ON public.site_config FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- ─── MEDIA ASSETS ────────────────────────────────────────────
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view media assets"
  ON public.media_assets FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated can view media assets"
  ON public.media_assets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert media assets"
  ON public.media_assets FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update media assets"
  ON public.media_assets FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete media assets"
  ON public.media_assets FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ─── ACTIVITY LOGS ───────────────────────────────────────────
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read activity logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert activity logs"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- ═══════════════════════════════════════════════════════════════
-- STORAGE BUCKET POLICIES
-- Run these in the Supabase SQL editor after creating the bucket.
-- ═══════════════════════════════════════════════════════════════
-- Note: The bucket 'hubcore-media' must be created via the
-- Supabase dashboard (Storage → New Bucket → Public bucket).
-- Then run:

-- INSERT INTO storage.buckets (id, name, public) VALUES ('hubcore-media', 'hubcore-media', true);

-- CREATE POLICY "Public can read media files"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'hubcore-media');

-- CREATE POLICY "Admins can upload media files"
--   ON storage.objects FOR INSERT
--   TO authenticated
--   WITH CHECK (bucket_id = 'hubcore-media' AND public.is_admin());

-- CREATE POLICY "Admins can update media files"
--   ON storage.objects FOR UPDATE
--   TO authenticated
--   USING (bucket_id = 'hubcore-media' AND public.is_admin());

-- CREATE POLICY "Admins can delete media files"
--   ON storage.objects FOR DELETE
--   TO authenticated
--   USING (bucket_id = 'hubcore-media' AND public.is_admin());
