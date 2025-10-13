/*
  # Update file submissions table for new form fields

  1. Changes
    - Add `ville` (text, nullable) - City/town name or auto-geolocation
    - Add `departement` (text, nullable) - Department number
    - Add `type_projet` (text, nullable) - Project type (neuf or renovation)
    - Remove old fields that are no longer used

  2. Notes
    - Maintains backward compatibility with existing data
    - New fields align with updated form structure
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'file_submissions' AND column_name = 'ville'
  ) THEN
    ALTER TABLE file_submissions ADD COLUMN ville text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'file_submissions' AND column_name = 'departement'
  ) THEN
    ALTER TABLE file_submissions ADD COLUMN departement text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'file_submissions' AND column_name = 'type_projet'
  ) THEN
    ALTER TABLE file_submissions ADD COLUMN type_projet text;
  END IF;
END $$;
