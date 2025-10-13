/*
  # Create file submissions tracking table

  1. New Tables
    - `file_submissions`
      - `id` (uuid, primary key) - Unique identifier for each submission
      - `nom` (text) - Name of the person submitting
      - `entreprise` (text) - Company name
      - `chantier` (text) - Construction site name
      - `message` (text, nullable) - Optional message
      - `created_at` (timestamptz) - Submission timestamp

  2. Security
    - Enable RLS on `file_submissions` table
    - Add policy for public insert access (form submissions)
*/

CREATE TABLE IF NOT EXISTS file_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  entreprise text NOT NULL,
  chantier text NOT NULL,
  message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE file_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert for file submissions"
  ON file_submissions
  FOR INSERT
  TO anon
  WITH CHECK (true);
