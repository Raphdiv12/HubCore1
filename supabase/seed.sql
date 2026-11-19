-- ============================================================
-- HUBCORE CMS — Authentic Seed Data
-- Seeds only genuine HubCore website copy and authentic projects.
-- Zero placeholder images or fabricated agency portfolio content.
-- Safe to rerun (idempotent via ON CONFLICT DO NOTHING).
-- ============================================================

-- ─── 1. SITE CONFIG (Homepage Copy) ──────────────────────────
-- Exact copy extracted from index.html (Hero, Philosophy, Process, Footer)

INSERT INTO public.site_config (key, value, value_type) VALUES
  -- Hero Section
  ('hero_tagline_line1', 'Your Vision,', 'text'),
  ('hero_tagline_line2', 'Our Design', 'text'),
  ('hero_body', 'Independent digital atelier crafting considered experiences for those who value intention over noise.', 'text'),

  -- Philosophy Section (Subheading & description)
  ('philosophy_heading', 'Craft in Motion', 'text'),
  ('philosophy_description', 'Things don''t simply appear as finished products. They become through observation, planning, making, refining, and the clarity of stepping back.', 'text'),

  -- Process Stages (01 to 05)
  ('process_stage_1_name', 'Observe', 'text'),
  ('process_stage_1_description', 'Understanding before action. We listen, research, and absorb the context of every brief before making a single mark.', 'text'),
  ('process_stage_2_name', 'Plan', 'text'),
  ('process_stage_2_description', 'Structure emerges from clarity. We map the architecture before we build, so nothing is arbitrary.', 'text'),
  ('process_stage_3_name', 'Make', 'text'),
  ('process_stage_3_description', 'Hands meet surface. The work takes form through material decisions, iterative craft, and focused execution.', 'text'),
  ('process_stage_4_name', 'Refine', 'text'),
  ('process_stage_4_description', 'Details matter at every scale. We polish until the work communicates with precision and without excess.', 'text'),
  ('process_stage_5_name', 'Step Back', 'text'),
  ('process_stage_5_description', 'Distance reveals what proximity conceals. We evaluate the whole before declaring the work complete.', 'text'),

  -- Footer
  ('footer_email', 'hello@hubcore.design', 'text'),
  ('footer_tagline', 'Your Vision, Our Design', 'text')
ON CONFLICT (key) DO NOTHING;

-- ─── 2. AUTHENTIC HUBCORE PROJECTS (5 Works) ─────────────────
-- Unifies homepage featured slots and /works/ exhibition plates.
-- Slots 1–5 correspond to the visual geometry of the 12-column grid.
-- Slots 6–8 remain unassigned and are cleanly hidden by the hydrator.

INSERT INTO public.projects (
  slug,
  title,
  category,
  discipline,
  summary,
  description,
  grid_layout_variant,
  asset_slot_id,
  is_featured_home,
  home_slot_index,
  home_sort_order,
  works_sort_order,
  status,
  thumbnail_url,
  hero_image_url,
  year,
  published_at
) VALUES
  (
    'hamza',
    'HAMZA',
    'Web experience',
    'Web experience',
    'A cinematic, anime-inspired web experience centred on Satoru Gojo.',
    'Conceived around manga-influenced composition and scroll-driven storytelling.',
    'large',      -- Home Slot 1 (Col 1-7, 4:3 ratio)
    'hamza',      -- Works Plate 01
    TRUE,
    1,
    1,
    1,
    'published',
    '',
    '',
    NULL,
    NOW()
  ),
  (
    'kukuchow',
    'KukuChow',
    'Digital Product',
    'Branding · Graphic design · Digital product',
    'A campus commerce and logistics product.',
    '',
    'portrait',   -- Home Slot 2 (Col 9-12, 3:4 ratio)
    'kukuchow',   -- Works Plate 02
    TRUE,
    2,
    2,
    2,
    'published',
    '',
    '',
    NULL,
    NOW()
  ),
  (
    'road-to-the-cross',
    'Road to the Cross',
    'Visual Storytelling',
    'RTTC · Visual storytelling',
    'Christ-centred visual storytelling drawn from classical, Renaissance and Baroque painting.',
    'Painterly frames, carried into motion with AI-assisted cinematography.',
    'medium',     -- Home Slot 3 (Col 5-10, 4:3 ratio)
    'rttc',       -- Works Plate 03
    TRUE,
    3,
    3,
    3,
    'published',
    '',
    '',
    NULL,
    NOW()
  ),
  (
    'becoming',
    'Becoming',
    'Independent Work',
    'Independent work',
    '',
    '',
    'small',      -- Home Slot 4 (Col 1-3, 1:1 ratio)
    'becoming',   -- Works Plate 04
    TRUE,
    4,
    4,
    4,
    'published',
    '',
    '',
    NULL,
    NOW()
  ),
  (
    'noric',
    'NORIC',
    'Digital Atelier',
    '',
    'Coming Soon', -- Availability status properly placed as summary
    '',
    'wide',       -- Home Slot 5 (Col 2-8, 16:9 ratio)
    'noric',      -- Works Plate 05
    TRUE,
    5,
    5,
    5,
    'published',
    '',
    '',
    NULL,
    NOW()
  )
ON CONFLICT (slug) DO NOTHING;
