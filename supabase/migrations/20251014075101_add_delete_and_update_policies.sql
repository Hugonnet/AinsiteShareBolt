/*
  # Add DELETE and UPDATE policies for file_submissions

  1. Security Changes
    - Add policy for authenticated users to delete submissions
    - Add policy for authenticated users to update submissions
    - These policies allow admin users to modify and delete projects
*/

-- Allow authenticated users to delete submissions
CREATE POLICY "Authenticated users can delete submissions"
  ON file_submissions
  FOR DELETE
  TO authenticated
  USING (true);

-- Allow authenticated users to update submissions
CREATE POLICY "Authenticated users can update submissions"
  ON file_submissions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
