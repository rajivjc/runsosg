-- Add active column to users table
-- Default true so all existing users remain active
ALTER TABLE public.users ADD COLUMN active boolean NOT NULL DEFAULT true;
