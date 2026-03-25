
-- Create trees table
CREATE TABLE public.trees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  tree_name TEXT NOT NULL,
  species TEXT NOT NULL,
  plantation_date DATE NOT NULL,
  height_cm NUMERIC NOT NULL,
  location TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  description TEXT,
  photo_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  ai_confidence NUMERIC,
  ai_analysis TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trees ENABLE ROW LEVEL SECURITY;

-- Anyone can read trees
CREATE POLICY "Anyone can view trees" ON public.trees FOR SELECT USING (true);

-- Authenticated users can insert their own trees
CREATE POLICY "Authenticated users can insert trees" ON public.trees FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can update their own trees
CREATE POLICY "Users can update own trees" ON public.trees FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Allow anonymous inserts (for users not logged in)
CREATE POLICY "Anonymous can insert trees" ON public.trees FOR INSERT TO anon WITH CHECK (user_id IS NULL);
