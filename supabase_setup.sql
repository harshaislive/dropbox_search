-- Enable UUID extension for primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create galleries table
CREATE TABLE galleries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    thumbnail_path TEXT NOT NULL,
    media_paths TEXT[] NOT NULL DEFAULT '{}',
    media_types TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT galleries_media_arrays_same_length 
        CHECK (array_length(media_paths, 1) = array_length(media_types, 1)),
    CONSTRAINT galleries_media_types_valid 
        CHECK (media_types <@ ARRAY['image', 'video']::TEXT[]),
    CONSTRAINT galleries_title_not_empty 
        CHECK (char_length(trim(title)) > 0),
    CONSTRAINT galleries_user_email_format 
        CHECK (user_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create likes table
CREATE TABLE likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(gallery_id, user_id), -- Prevent duplicate likes
    CONSTRAINT likes_user_id_not_empty 
        CHECK (char_length(trim(user_id)) > 0)
);

-- Create comments table
CREATE TABLE comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT comments_content_not_empty 
        CHECK (char_length(trim(content)) > 0),
    CONSTRAINT comments_user_id_not_empty 
        CHECK (char_length(trim(user_id)) > 0)
);

-- Create indexes for performance
CREATE INDEX idx_galleries_user_id ON galleries(user_id);
CREATE INDEX idx_galleries_user_email ON galleries(user_email);
CREATE INDEX idx_galleries_created_at ON galleries(created_at DESC);
CREATE INDEX idx_galleries_title ON galleries USING GIN(to_tsvector('english', title));

CREATE INDEX idx_likes_gallery_id ON likes(gallery_id);
CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_likes_created_at ON likes(created_at DESC);

CREATE INDEX idx_comments_gallery_id ON comments(gallery_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for galleries table
CREATE TRIGGER update_galleries_updated_at 
    BEFORE UPDATE ON galleries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Gallery policies (allow public read, authenticated users manage their own)
CREATE POLICY "Allow read access to all galleries" 
ON galleries FOR SELECT 
USING (true);

CREATE POLICY "Allow authenticated users to create galleries" 
ON galleries FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow users to update their own galleries" 
ON galleries FOR UPDATE 
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Allow users to delete their own galleries" 
ON galleries FOR DELETE 
USING (user_id = auth.uid()::text);

-- Likes policies
CREATE POLICY "Allow read access to all likes" 
ON likes FOR SELECT 
USING (true);

CREATE POLICY "Allow authenticated users to create likes" 
ON likes FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid()::text);

CREATE POLICY "Allow users to delete their own likes" 
ON likes FOR DELETE 
USING (user_id = auth.uid()::text);

-- Comments policies
CREATE POLICY "Allow read access to all comments" 
ON comments FOR SELECT 
USING (true);

CREATE POLICY "Allow authenticated users to create comments" 
ON comments FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid()::text);

CREATE POLICY "Allow users to update their own comments" 
ON comments FOR UPDATE 
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Allow users to delete their own comments" 
ON comments FOR DELETE 
USING (user_id = auth.uid()::text);

-- Create view for galleries with statistics
CREATE VIEW galleries_with_stats AS
SELECT 
    g.*,
    COALESCE(l.like_count, 0) as like_count,
    COALESCE(c.comment_count, 0) as comment_count
FROM galleries g
LEFT JOIN (
    SELECT gallery_id, COUNT(*) as like_count 
    FROM likes 
    GROUP BY gallery_id
) l ON g.id = l.gallery_id
LEFT JOIN (
    SELECT gallery_id, COUNT(*) as comment_count 
    FROM comments 
    GROUP BY gallery_id
) c ON g.id = c.gallery_id; 