
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  trees_planted INTEGER NOT NULL DEFAULT 0,
  green_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read own profile
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Users can update own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update profile stats when a tree is inserted
CREATE OR REPLACE FUNCTION public.update_profile_on_tree()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET trees_planted = trees_planted + 1,
        green_points = green_points + 20,
        updated_at = now()
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_tree_planted
  AFTER INSERT ON public.trees
  FOR EACH ROW EXECUTE FUNCTION public.update_profile_on_tree();
