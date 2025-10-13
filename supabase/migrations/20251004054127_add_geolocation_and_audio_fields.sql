/*
  # Add geolocation and audio fields to file submissions

  1. Changes
    - Add `latitude` (numeric, nullable) - Latitude coordinate from device
    - Add `longitude` (numeric, nullable) - Longitude coordinate from device  
    - Add `location_accuracy` (numeric, nullable) - Location accuracy in meters
    - Add `audio_description_url` (text, nullable) - URL to audio recording file
    - Add `audio_duration` (integer, nullable) - Duration of audio in seconds

  2. Notes
    - Geolocation fields allow tracking submission origin
    - Audio description provides alternative to text input
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'file_submissions' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE file_submissions ADD COLUMN latitude numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'file_submissions' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE file_submissions ADD COLUMN longitude numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'file_submissions' AND column_name = 'location_accuracy'
  ) THEN
    ALTER TABLE file_submissions ADD COLUMN location_accuracy numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'file_submissions' AND column_name = 'audio_description_url'
  ) THEN
    ALTER TABLE file_submissions ADD COLUMN audio_description_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'file_submissions' AND column_name = 'audio_duration'
  ) THEN
    ALTER TABLE file_submissions ADD COLUMN audio_duration integer;
  END IF;
END $$;
