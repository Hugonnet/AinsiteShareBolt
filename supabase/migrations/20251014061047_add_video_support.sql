/*
  # Add video support to file_submissions table

  1. Changes
    - Add `video_url` column to store video file URL
    - Add `video_duration` column to store video length in seconds
    - Both columns are nullable as videos are optional

  2. Notes
    - Videos will be stored in the video-recordings bucket
    - Maximum duration will be enforced on the frontend (40 seconds)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'file_submissions' AND column_name = 'video_url'
  ) THEN
    ALTER TABLE file_submissions ADD COLUMN video_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'file_submissions' AND column_name = 'video_duration'
  ) THEN
    ALTER TABLE file_submissions ADD COLUMN video_duration integer;
  END IF;
END $$;
