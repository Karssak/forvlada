import sqlite3
import os
from typing import List, Any, Optional

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "users.db")


def get_db() -> sqlite3.Connection:
    try:
        conn = sqlite3.connect(DB_PATH, timeout=10.0)
        conn.row_factory = sqlite3.Row
        return conn
    except sqlite3.Error as e:
        print(f"Database connection error: {e}")
        raise


def query_db(query: str, args: tuple = (), one: bool = False) -> Optional[Any]:
    try:
        with get_db() as conn:
            cur = conn.execute(query, args)
            rv = cur.fetchall()
        if one:
            return rv[0] if rv else None
        return rv
    except sqlite3.Error as e:
        print(f"Database query error: {e}")
        return None if one else []


def execute_db(query: str, args: tuple = ()) -> int:
    try:
        with get_db() as conn:
            cur = conn.execute(query, args)
            conn.commit()
            return cur.lastrowid if cur.lastrowid else 0
    except sqlite3.IntegrityError as e:
        print(f"Database integrity error: {e}")
        raise
    except sqlite3.Error as e:
        print(f"Database execution error: {e}")
        return 0


def init_db():
    schema = {
        "users": """CREATE TABLE IF NOT EXISTS users
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  first_name TEXT,
                  last_name TEXT,
                  email TEXT UNIQUE NOT NULL,
                  password TEXT NOT NULL,
                  family_id INTEGER,
                  role TEXT DEFAULT 'parent')""",
        "families": """CREATE TABLE IF NOT EXISTS families
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT NOT NULL,
                  color TEXT DEFAULT 'blue',
                  created_by INTEGER NOT NULL,
                  invite_code TEXT UNIQUE NOT NULL)""",
        "transactions": """CREATE TABLE IF NOT EXISTS transactions
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id INTEGER NOT NULL,
                  family_id INTEGER NOT NULL,
                  amount REAL NOT NULL,
                  description TEXT,
                  type TEXT NOT NULL,
                  date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  category TEXT,
                  is_recurring INTEGER DEFAULT 0,
                  recurrence TEXT,
                  next_due_date DATE)""",
        "goals": """CREATE TABLE IF NOT EXISTS goals
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  family_id INTEGER NOT NULL,
                  name TEXT NOT NULL,
                  target_amount REAL NOT NULL,
                  current_amount REAL DEFAULT 0,
                  deadline DATE)""",
        "budgets": """CREATE TABLE IF NOT EXISTS budgets
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  family_id INTEGER NOT NULL,
                  category TEXT NOT NULL,
                  amount REAL NOT NULL,
                  period TEXT DEFAULT 'monthly')""",
    }

    with get_db() as conn:
        for create_sql in schema.values():
            conn.execute(create_sql)
        
        conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_families_invite_code ON families(invite_code)")
        conn.commit()
