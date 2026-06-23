-- ============================================
-- Migration v6 - User Management RLS Policies
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================

-- 1. Drop existing restrictive policies on profiles
DROP POLICY IF EXISTS "pr_select" ON profiles;
DROP POLICY IF EXISTS "pr_update" ON profiles;

-- 2. Gestores and admins can view all profiles
CREATE POLICY "pr_select_gestor" ON profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('gestor', 'admin'))
    OR id = (select auth.uid())
  );

-- 3. Gestores and admins can update any profile
CREATE POLICY "pr_update_gestor" ON profiles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('gestor', 'admin'))
  );

-- 4. Gestores and admins can insert profiles (for creating users)
CREATE POLICY "pr_insert_gestor" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('gestor', 'admin'))
  );

-- 5. Gestores and admins can delete profiles (except themselves)
CREATE POLICY "pr_delete_gestor" ON profiles
  FOR DELETE TO authenticated
  USING (
    id != (select auth.uid())
    AND EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role IN ('gestor', 'admin'))
  );

-- 6. Anon policies for profiles (demo mode)
DO $$ BEGIN
  CREATE POLICY "pr_anon_select" ON profiles FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "pr_anon_insert" ON profiles FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "pr_anon_update" ON profiles FOR UPDATE TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "pr_anon_delete" ON profiles FOR DELETE TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
