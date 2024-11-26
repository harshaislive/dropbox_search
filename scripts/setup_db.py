import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Database connection URL
DATABASE_URL = "postgresql://postgres:HQbKkdgEToGyHZTlzjYMyjNEimqpjVDR@junction.proxy.rlwy.net:11845/railway"

# SQL queries
create_tables_queries = [
    """
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
    """,
    """
    CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        login_time TIMESTAMP NOT NULL,
        logout_time TIMESTAMP,
        search_count INTEGER NOT NULL
    );
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_search_analytics_email ON search_analytics(email);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_search_analytics_timestamp ON search_analytics(timestamp);
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_user_sessions_email ON user_sessions(email);
    """
]

def create_tables():
    try:
        # Connect to the database
        print("Connecting to PostgreSQL database...")
        conn = psycopg2.connect(DATABASE_URL, sslmode='require')
        
        # Set isolation level
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        
        # Create a cursor
        cur = conn.cursor()
        
        # Execute each query
        for query in create_tables_queries:
            print(f"Executing query:\n{query}")
            cur.execute(query)
            print("Query executed successfully!")
        
        print("All tables and indexes created successfully!")
        
    except Exception as e:
        print(f"An error occurred: {e}")
    
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()
            print("Database connection closed.")

if __name__ == "__main__":
    create_tables()
