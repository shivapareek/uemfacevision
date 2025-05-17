import sqlite3

conn = sqlite3.connect("database.db", check_same_thread=False)
cursor = conn.cursor()

# ✅ Check if column exists before adding
cursor.execute("PRAGMA table_info(faces)")
columns = [col[1] for col in cursor.fetchall()]

if "original_image_path" not in columns:
    cursor.execute("ALTER TABLE faces ADD COLUMN original_image_path TEXT")
    conn.commit()
    print("✅ Column 'original_image_path' added successfully!")
else:
    print("⚠️ Column 'original_image_path' already exists.")

conn.close()
