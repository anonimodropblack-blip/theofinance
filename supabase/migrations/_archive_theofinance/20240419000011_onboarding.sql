-- =============================================================================
-- Migration: Fase 10 — Onboarding flag
-- =============================================================================

alter table couples
  add column if not exists onboarded_at timestamptz default null,
  add column if not exists display_name text default null;
