#!/usr/bin/env python3
"""
Import cleaned CSV files (data_clean_part_1.csv through data_clean_part_7.csv)
into PostgreSQL database. Drops existing database and recreates it.
"""

import csv
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
import re
from datetime import datetime

# Database configuration
DB_HOST = "localhost"
DB_PORT = 5432
DB_NAME = "multi_frame_streaming"
DB_USER = "postgres"
DB_PASSWORD = "ilhomcha"

# CSV file locations
CSV_BASE_PATH = "e:/project-serious"
CSV_FILES = [
    "data_clean_part_1.csv",
    "data_clean_part_2.csv",
    "data_clean_part_3.csv",
    "data_clean_part_4.csv",
    "data_clean_part_5.csv",
    "data_clean_part_6.csv",
    "data_clean_part_7.csv"
]

def extract_video_id(url):
    """Extract video ID from URL"""
    if not url:
        return None
    match = re.search(r'video\.([a-z0-9]+)', url)
    return match.group(1) if match else None

def construct_iframe(video_id):
    """Construct iframe HTML from video ID"""
    if not video_id:
        return None
    return f'<iframe src="https://www.xvideos.com/embedframe/{video_id}" frameborder="0" width="510" height="400" scrolling="no" allowfullscreen="allowfullscreen"></iframe>'

def parse_duration(duration_str):
    """Parse duration string like '1305 sec' to integer seconds"""
    if not duration_str:
        return None
    match = re.search(r'(\d+)', duration_str)
    return int(match.group(1)) if match else None

def parse_views(views_str):
    """Parse views string to integer"""
    if not views_str:
        return 0
    try:
        return int(views_str.replace(',', '').strip())
    except:
        return 0

def drop_and_create_database():
    """Drop existing database and create a fresh one"""
    print("\n=== DATABASE RESET ===")
    
    # Connect to PostgreSQL server (not specific database)
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database="postgres",
            user=DB_USER,
            password=DB_PASSWORD
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Terminate all connections to the database
        print(f"Terminating connections to '{DB_NAME}'...")
        cursor.execute(f"""
            SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = '{DB_NAME}'
            AND pid <> pg_backend_pid()
        """)
        
        # Drop database if exists
        print(f"Dropping database '{DB_NAME}' if it exists...")
        cursor.execute(f"DROP DATABASE IF EXISTS {DB_NAME}")
        print("✓ Database dropped")
        
        # Create fresh database
        print(f"Creating database '{DB_NAME}'...")
        cursor.execute(f"CREATE DATABASE {DB_NAME}")
        print("✓ Database created")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"✗ Error resetting database: {e}")
        return False

def create_tables():
    """Create tables matching Prisma schema"""
    print("\n=== CREATING TABLES ===")
    
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        cursor = conn.cursor()
        
        # Create videos table matching Prisma schema
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS videos (
                id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
                title TEXT NOT NULL,
                source_url TEXT,
                thumbnail_url TEXT NOT NULL,
                duration INTEGER,
                file_path TEXT,
                compressed BOOLEAN DEFAULT false,
                likes INTEGER DEFAULT 0,
                dislikes INTEGER DEFAULT 0,
                category TEXT,
                iframe TEXT,
                tags TEXT,
                performers TEXT,
                quality TEXT,
                uploader TEXT,
                publish_date TEXT,
                views INTEGER DEFAULT 0,
                stream_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create streams table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS streams (
                id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
                name TEXT NOT NULL,
                source TEXT NOT NULL,
                query TEXT NOT NULL,
                last_pulled TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create user_settings table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_settings (
                id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
                compression_level TEXT DEFAULT '720p',
                bitrate TEXT DEFAULT '1500k',
                multi_view_layout INTEGER DEFAULT 4,
                auto_pull_frequency INTEGER DEFAULT 24,
                like_threshold INTEGER DEFAULT 5,
                dislike_threshold INTEGER DEFAULT 3,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print("✓ Tables created successfully")
        return True
        
    except Exception as e:
        print(f"✗ Error creating tables: {e}")
        return False

def import_csv_file(file_path, file_num, total_files):
    """Import a single CSV file into the database"""
    
    if not os.path.exists(file_path):
        print(f"✗ File not found: {file_path}")
        return 0, 0
    
    print(f"\n[{file_num}/{total_files}] Processing: {os.path.basename(file_path)}")
    
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        cursor = conn.cursor()
        
        imported = 0
        skipped = 0
        batch_size = 5000
        batch = []
        
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            reader = csv.DictReader(f, delimiter=';')
            
            for row_num, row in enumerate(reader, 1):
                try:
                    # Extract data from CSV columns
                    video_url = row.get('video_url', '').strip()
                    title = row.get('title', '').strip()
                    duration_str = row.get('duration', '').strip()
                    thumbnail_url = row.get('thumbnail_url', '').strip()
                    embed_code = row.get('embed_code', '').strip()
                    tags = row.get('tags', '').strip()
                    actors = row.get('actors', '').strip()
                    views_str = row.get('views', '').strip()
                    category = row.get('category', '').strip()
                    quality = row.get('quality', '').strip()
                    uploader = row.get('uploader', '').strip()
                    publish_date = row.get('publish_date', '').strip()
                    thumbnail_url_2 = row.get('thumbnail_url_2', '').strip()
                    
                    # Skip rows without essential data
                    if not title or not video_url:
                        skipped += 1
                        continue
                    
                    # Extract video ID and construct iframe
                    video_id = extract_video_id(video_url)
                    iframe = construct_iframe(video_id)
                    
                    # Parse numeric fields
                    duration = parse_duration(duration_str)
                    views = parse_views(views_str)
                    
                    # Use thumbnail_url_2 if available, otherwise use thumbnail_url
                    final_thumbnail = thumbnail_url_2 if thumbnail_url_2 else thumbnail_url
                    
                    if not final_thumbnail:
                        skipped += 1
                        continue
                    
                    # Add to batch
                    batch.append((
                        title,
                        video_url,
                        final_thumbnail,
                        duration,
                        category,
                        iframe,
                        tags,
                        actors,
                        quality,
                        uploader,
                        publish_date,
                        views
                    ))
                    
                    # Execute batch insert
                    if len(batch) >= batch_size:
                        cursor.executemany("""
                            INSERT INTO videos 
                            (title, source_url, thumbnail_url, duration, category, iframe, 
                             tags, performers, quality, uploader, publish_date, views)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """, batch)
                        conn.commit()
                        imported += len(batch)
                        print(f"  Progress: {imported:,} imported, {skipped:,} skipped")
                        batch = []
                    
                except Exception as e:
                    skipped += 1
                    if row_num < 10:  # Only show first few errors
                        print(f"  Row {row_num} error: {e}")
                    continue
            
            # Insert remaining batch
            if batch:
                cursor.executemany("""
                    INSERT INTO videos 
                    (title, source_url, thumbnail_url, duration, category, iframe, 
                     tags, performers, quality, uploader, publish_date, views)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, batch)
                conn.commit()
                imported += len(batch)
        
        cursor.close()
        conn.close()
        
        print(f"✓ Completed: {imported:,} imported, {skipped:,} skipped")
        return imported, skipped
        
    except Exception as e:
        print(f"✗ Error processing file: {e}")
        return 0, 0

def show_summary():
    """Show import summary and sample data"""
    print("\n=== IMPORT SUMMARY ===")
    
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        cursor = conn.cursor()
        
        # Total count
        cursor.execute("SELECT COUNT(*) FROM videos")
        total = cursor.fetchone()[0]
        print(f"Total videos in database: {total:,}")
        
        # Category breakdown
        cursor.execute("""
            SELECT category, COUNT(*) as count 
            FROM videos 
            WHERE category IS NOT NULL AND category != ''
            GROUP BY category 
            ORDER BY count DESC 
            LIMIT 10
        """)
        categories = cursor.fetchall()
        
        if categories:
            print("\nTop categories:")
            for cat, count in categories:
                print(f"  {cat}: {count:,}")
        
        # Sample records
        cursor.execute("""
            SELECT title, category, duration, views 
            FROM videos 
            ORDER BY views DESC 
            LIMIT 5
        """)
        samples = cursor.fetchall()
        
        if samples:
            print("\nTop 5 most viewed videos:")
            for i, (title, cat, dur, views) in enumerate(samples, 1):
                title_short = title[:60] + "..." if len(title) > 60 else title
                print(f"  {i}. {title_short}")
                print(f"     Category: {cat}, Duration: {dur}s, Views: {views:,}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"Error showing summary: {e}")

def main():
    """Main import process"""
    print("=" * 60)
    print("CSV DATA IMPORT SCRIPT")
    print("=" * 60)
    print(f"Database: {DB_NAME}")
    print(f"CSV Location: {CSV_BASE_PATH}")
    print(f"Files to import: {len(CSV_FILES)}")
    
    # Step 1: Drop and recreate database
    if not drop_and_create_database():
        print("\n✗ Failed to reset database. Aborting.")
        return
    
    # Step 2: Create tables
    if not create_tables():
        print("\n✗ Failed to create tables. Aborting.")
        return
    
    # Step 3: Import all CSV files
    print("\n=== IMPORTING CSV FILES ===")
    total_imported = 0
    total_skipped = 0
    
    for i, csv_file in enumerate(CSV_FILES, 1):
        file_path = os.path.join(CSV_BASE_PATH, csv_file)
        imported, skipped = import_csv_file(file_path, i, len(CSV_FILES))
        total_imported += imported
        total_skipped += skipped
    
    # Step 4: Show summary
    print("\n" + "=" * 60)
    print(f"✓ IMPORT COMPLETE")
    print(f"Total imported: {total_imported:,}")
    print(f"Total skipped: {total_skipped:,}")
    print("=" * 60)
    
    show_summary()

if __name__ == "__main__":
    main()
