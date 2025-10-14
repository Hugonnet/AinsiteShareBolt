/*
  # Add SELECT policy for authenticated users

  1. Security Changes
    - Add policy for authenticated users to view all submissions
    - This allows admin users to see all projects in the admin panel
*/

-- Allow authenticated users to view all submissions
CREATE POLICY "Authenticated users can view all submissions"
  ON file_submissions
  FOR SELECT
  TO authenticated
  USING (true);
