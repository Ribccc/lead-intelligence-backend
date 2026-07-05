import sqlite3
import os

db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "prisma", "dev.db"))
print(f"Connecting to SQLite database at: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall()]
    print(f"Tables in SQLite database: {tables}")
    
    if "Lead" in tables:
        # Get count of leads
        cursor.execute("SELECT COUNT(*) FROM Lead;")
        total_leads = cursor.fetchone()[0]
        print(f"Total leads in SQLite 'Lead' table: {total_leads}")
        
        # Group by status
        cursor.execute("SELECT status, COUNT(*) FROM Lead GROUP BY status;")
        status_groups = cursor.fetchall()
        print("Leads grouped by status:")
        for status, count in status_groups:
            print(f"  {status}: {count}")
            
        # Select latest 10 leads
        cursor.execute("SELECT id, companyName, status, createdAt FROM Lead ORDER BY createdAt DESC LIMIT 10;")
        latest_leads = cursor.fetchall()
        print("\nLatest 10 leads:")
        for row in latest_leads:
            print(f"  ID: {row[0]} | Name: {row[1]} | Status: {row[2]} | CreatedAt: {row[3]}")
    else:
        print("Lead table not found in SQLite database.")
        
    conn.close()
except Exception as e:
    print(f"Error querying SQLite: {e}")
