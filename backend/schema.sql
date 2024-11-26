-- Create search_analytics table
CREATE TABLE IF NOT EXISTS search_analytics (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    query TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    result_count INTEGER NOT NULL,
    search_duration INTEGER NOT NULL,
    media_type VARCHAR(50) NOT NULL,
    date_filter VARCHAR(50) NOT NULL
);

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    login_time TIMESTAMP NOT NULL,
    logout_time TIMESTAMP,
    search_count INTEGER DEFAULT 0
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_search_analytics_email ON search_analytics(email);
CREATE INDEX IF NOT EXISTS idx_search_analytics_timestamp ON search_analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_sessions_email ON user_sessions(email);
CREATE INDEX IF NOT EXISTS idx_user_sessions_login_time ON user_sessions(login_time);
