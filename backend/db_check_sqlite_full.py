import sqlite3
import os

db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "prisma", "dev.db"))
print(f"Querying all tables in SQLite database at: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall()]
    
    for table in tables:
        if table.startswith('_'):
            continue
        cursor.execute(f"SELECT COUNT(*) FROM [{table}];")
        count = cursor.fetchone()[0]
        print(f"Table: {table} | Rows: {count}")
        
    # Let's inspect PipelineNode
    if "PipelineNode" in tables:
        cursor.execute("SELECT id, type, name, status, processed FROM PipelineNode;")
        nodes = cursor.fetchall()
        print("\nPipeline Nodes:")
        for n in nodes:
            print(f"  ID: {n[0]} | Type: {n[1]} | Name: {n[2]} | Status: {n[3]} | Processed: {n[4]}")
            
    # Let's inspect ActivityFeed
    if "ActivityFeed" in tables:
        cursor.execute("SELECT id, type, title, description, createdAt FROM ActivityFeed ORDER BY createdAt DESC LIMIT 10;")
        feeds = cursor.fetchall()
        print("\nLatest 10 Activity Feeds:")
        for f in feeds:
            print(f"  ID: {f[0]} | Type: {f[1]} | Title: {f[2]} | Desc: {f[3]} | Created: {f[4]}")

    # Let's inspect AuditLog
    if "AuditLog" in tables:
        cursor.execute("SELECT id, action, details, timestamp FROM AuditLog ORDER BY timestamp DESC LIMIT 10;")
        audits = cursor.fetchall()
        print("\nLatest 10 Audit Logs:")
        for a in audits:
            print(f"  ID: {a[0]} | Action: {a[1]} | Details: {a[2]} | Timestamp: {a[3]}")
            
    conn.close()
except Exception as e:
    print(f"Error: {e}")
