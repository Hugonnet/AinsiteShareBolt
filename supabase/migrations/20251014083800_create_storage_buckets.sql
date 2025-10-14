/*
  # Create Storage Buckets and Policies

  1. New Buckets
    - `construction-files` - For storing project photos and files
      - Public bucket for easy access
      - Organized by submission ID
    - `audio-recordings` - For storing voice messages
      - Public bucket
    - `video-recordings` - For storing video recordings
      - Public bucket
    
  2. Security
    - Enable public access for all buckets
    - Allow authenticated admin users to manage files
    - Allow public read access to all files
*/

-- Create construction-files bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('construction-files', 'construction-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create audio-recordings bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-recordings', 'audio-recordings', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create video-recordings bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('video-recordings', 'video-recordings', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if they exist to avoid conflicts
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Public read access for construction files" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload construction files" ON storage.objects;
  DROP POLICY IF EXISTS "Service role can manage construction files" ON storage.objects;
  DROP POLICY IF EXISTS "Public read access for audio recordings" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload audio" ON storage.objects;
  DROP POLICY IF EXISTS "Service role can manage audio recordings" ON storage.objects;
  DROP POLICY IF EXISTS "Public read access for video recordings" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload video" ON storage.objects;
  DROP POLICY IF EXISTS "Service role can manage video recordings" ON storage.objects;
END $$;

-- Policies for construction-files bucket
-- Allow public read access
CREATE POLICY "Public read access for construction files"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'construction-files');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload construction files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'construction-files');

-- Allow service role to manage all files
CREATE POLICY "Service role can manage construction files"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'construction-files');

-- Policies for audio-recordings bucket
CREATE POLICY "Public read access for audio recordings"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'audio-recordings');

CREATE POLICY "Authenticated users can upload audio"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'audio-recordings');

CREATE POLICY "Service role can manage audio recordings"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'audio-recordings');

-- Policies for video-recordings bucket
CREATE POLICY "Public read access for video recordings"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'video-recordings');

CREATE POLICY "Authenticated users can upload video"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'video-recordings');

CREATE POLICY "Service role can manage video recordings"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'video-recordings');