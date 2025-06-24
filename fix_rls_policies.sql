-- Drop existing policies that rely on Supabase auth
DROP POLICY IF EXISTS "Allow authenticated users to create galleries" ON galleries;
DROP POLICY IF EXISTS "Allow users to update their own galleries" ON galleries;
DROP POLICY IF EXISTS "Allow users to delete their own galleries" ON galleries;
DROP POLICY IF EXISTS "Allow authenticated users to create likes" ON likes;
DROP POLICY IF EXISTS "Allow users to delete their own likes" ON likes;
DROP POLICY IF EXISTS "Allow authenticated users to create comments" ON comments;
DROP POLICY IF EXISTS "Allow users to update their own comments" ON comments;
DROP POLICY IF EXISTS "Allow users to delete their own comments" ON comments;

-- Create new policies that work with custom authentication
-- Gallery policies (more permissive since you handle auth in your app)
CREATE POLICY "Allow create galleries with user_id" 
ON galleries FOR INSERT 
WITH CHECK (user_id IS NOT NULL AND char_length(trim(user_id)) > 0);

CREATE POLICY "Allow users to update their own galleries" 
ON galleries FOR UPDATE 
USING (user_id IS NOT NULL)
WITH CHECK (user_id IS NOT NULL);

CREATE POLICY "Allow users to delete their own galleries" 
ON galleries FOR DELETE 
USING (user_id IS NOT NULL);

-- Likes policies
CREATE POLICY "Allow create likes with user_id" 
ON likes FOR INSERT 
WITH CHECK (user_id IS NOT NULL AND char_length(trim(user_id)) > 0);

CREATE POLICY "Allow users to delete their own likes" 
ON likes FOR DELETE 
USING (user_id IS NOT NULL);

-- Comments policies  
CREATE POLICY "Allow create comments with user_id" 
ON comments FOR INSERT 
WITH CHECK (user_id IS NOT NULL AND char_length(trim(user_id)) > 0);

CREATE POLICY "Allow users to update their own comments" 
ON comments FOR UPDATE 
USING (user_id IS NOT NULL)
WITH CHECK (user_id IS NOT NULL);

CREATE POLICY "Allow users to delete their own comments" 
ON comments FOR DELETE 
USING (user_id IS NOT NULL); 