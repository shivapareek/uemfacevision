import sqlite3
conn = sqlite3.connect("database.db")
cursor = conn.cursor()
cursor.execute("SELECT * FROM faces")
print(cursor.fetchall())
conn.close()