#!/usr/bin/env python3
"""
CSV to PostgreSQL Import Script
Handles large CSV files with pipe-separated values
"""

import csv
import psycopg2
import os
import sys
from datetime import datetime
import re

def extract_video_id(url):
    """Extract video ID from URL"""
    match = re.search(r'video\.([a-z0-9]+)', url)
    return match.group(1) if match else None

def construct_iframe(video_id):
    """Construct iframe HTML"""
    return f'<iframe src="https://www.xvideos.com/embedframe/{video_id}" frameborder="0" width="510" height="400" scrolling="no" allowfullscreen="allowfullscreen"></iframe>'

def parse_duration(duration_str):
    """Parse duration string like '1305 sec' to integer"""
    if not duration_str:
        return None
    match = re.search(r'(\d+)', duration_str)
    return int(match.group(1)) if match else None

def parse_views(views_str):
    """Parse views string to integer"""
    if not views_str:
        return 0
    return int(views_str.replace(',', ''))

def get_db_connection():
    """Create database connection"""
    try:
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            database="multi_frame_streaming",
            user="postgres",
            password="ilhomcha"
        )
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None

def create_table_if_not_exists(conn):
    """Create temporary table for import"""
    cursor = conn.cursor()
    
    # Create a staging table that matches CSV structure
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS video_staging (
            url TEXT,
            title TEXT,
            duration TEXT,
            thumbnail_url TEXT,
            iframe TEXT,
            tags TEXT,
            actors TEXT,
            views TEXT,
            quality TEXT,
            category TEXT,
            empty TEXT,
            publish_date TEXT,
            thumbnail_url2 TEXT,
            unknown TEXT
        )
    """)
    
    # Create final table if it doesn't exist (matching your Prisma schema)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS videos (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
            title TEXT NOT NULL,
            source_url TEXT,
            thumbnail_url TEXT,
            duration INTEGER,
            file_path TEXT,
            compressed BOOLEAN DEFAULT false,
            likes INTEGER DEFAULT 0,
            dislikes INTEGER DEFAULT 0,
            category TEXT,
            iframe TEXT,
            tags TEXT,
            performers TEXT,
            stream_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    cursor.close()

def import_csv_file(conn, csv_file_path):
    """Import a single CSV file"""
    if not os.path.exists(csv_file_path):
        print(f"File not found: {csv_file_path}")
        return 0, 0
    
    cursor = conn.cursor()
    imported = 0
    skipped = 0
    
    print(f"\nProcessing: {os.path.basename(csv_file_path)}")
    
    try:
        with open(csv_file_path, 'r', encoding='utf-8', errors='ignore') as file:
            reader = csv.reader(file, delimiter='|')
            
            # Skip header
            next(reader, None)
            
            for row_num, row in enumerate(reader, 1):
                try:
                    # Ensure we have enough columns
                    if len(row) < 14:
                        skipped += 1
                        continue
                    
                    url = row[0].strip()
                    title = row[1].strip()
                    duration_str = row[2].strip()
                    thumbnail_url = row[3].strip()
                    iframe_raw = row[4].strip()
                    tags = row[5].strip()
                    actors = row[6].strip()
                    views_str = row[7].strip()
                    quality = row[8].strip()
                    category = row[9].strip()
                    publish_date = row[11].strip()
                    thumbnail_url2 = row[12].strip()
                    
                    # Skip rows without essential data
                    if not title or not url:
                        skipped += 1
                        continue
                    
                    # Extract video ID and construct iframe
                    video_id = extract_video_id(url)
                    if not video_id:
                        skipped += 1
                        continue
                    
                    iframe = construct_iframe(video_id)
                    duration = parse_duration(duration_str)
                    views = parse_views(views_str)
                    
                    # Use thumbnail_url2 as primary if available
                    final_thumbnail = thumbnail_url2 if thumbnail_url2 else thumbnail_url
                    
                    # Insert into staging table first
                    cursor.execute("""
                        INSERT INTO video_staging 
                        (url, title, duration, thumbnail_url, iframe, tags, actors, views, quality, category, empty, publish_date, thumbnail_url2, unknown)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (url, title, duration_str, thumbnail_url, iframe_raw, tags, actors, views_str, quality, category, '', publish_date, thumbnail_url2, ''))
                    
                    # Insert into final videos table
                    cursor.execute("""
                        INSERT INTO videos 
                        (title, source_url, thumbnail_url, duration, iframe, tags, performers, category)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """, (title, url, final_thumbnail, duration, iframe, tags, actors, category or quality))
                    
                    imported += 1
                    
                    if imported % 1000 == 0:
                        print(f"  Progress: {imported} imported, {skipped} skipped")
                        conn.commit()
                        
                except Exception as e:
                    print(f"Error on row {row_num}: {e}")
                    skipped += 1
                    continue
                    
    except Exception as e:
        print(f"Error reading file: {e}")
    
    cursor.close()
    return imported, skipped

def main():
    """Main import function"""
    print("Starting CSV to PostgreSQL import...")
    
    # Test database connection
    conn = get_db_connection()
    if not conn:
        print("Failed to connect to database")
        return
    
    print("✓ Database connection successful")
    
    # Create tables
    create_table_if_not_exists(conn)
    print("✓ Tables ready")
    
    # List of CSV files to import
    csv_files = [
        'data_clean_part_1.csv',
        'data_clean_part_2.csv',
        'data_clean_part_3.csv',
        'data_clean_part_4.csv',
        'data_clean_part_5.csv',
        'data_clean_part_6.csv',
        'data_clean_part_7.csv'
    ]
    
    total_imported = 0
    total_skipped = 0
    
    for csv_file in csv_files:
        csv_path = os.path.join(os.getcwd(), csv_file)
        imported, skipped = import_csv_file(conn, csv_path)
        total_imported += imported
        total_skipped += skipped
        print(f"✓ {csv_file}: {imported} imported, {skipped} skipped")
        
        # Commit after each file
        conn.commit()
    
    # Show summary
    print(f"\n=== IMPORT COMPLETE ===")
    print(f"Total imported: {total_imported}")
    print(f"Total skipped: {total_skipped}")
    print(f"Final total: {total_imported + total_skipped}")
    
    # Show sample of imported data
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM videos")
    count = cursor.fetchone()[0]
    print(f"Total records in videos table: {count}")
    
    cursor.execute("SELECT title, source_url, category FROM videos LIMIT 3")
    samples = cursor.fetchall()
    print("\nSample records:")
    for sample in samples:
        print(f"  - {sample[0][:50]}... | {sample[2]}")
    
    cursor.close()
    conn.close()
    print("\n✓ Database connection closed")

if __name__ == "__main__":
    main()