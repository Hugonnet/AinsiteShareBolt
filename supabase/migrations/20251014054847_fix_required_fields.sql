/*
  # Fix required fields in file_submissions table

  1. Changes
    - Make `nom` and `chantier` columns nullable as they are not used in the new form
    - These fields were required in the old schema but are no longer needed
    - This ensures compatibility with the new form structure

  2. Notes
    - Maintains backward compatibility with existing data
    - Aligns database schema with current form fields
*/

DO $$
BEGIN
  ALTER TABLE file_submissions ALTER COLUMN nom DROP NOT NULL;
  ALTER TABLE file_submissions ALTER COLUMN chantier DROP NOT NULL;
END $$;
