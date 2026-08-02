import logging
import sqlite3
import os
from contextlib import contextmanager
from typing import Any, Iterator, Optional

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.environ.get("DATA_DIR", os.path.join(BASE_DIR, "data"))
os.makedirs(DATA_DIR, exist_ok=True)
DB_PATH = os.path.join(DATA_DIR, "users.db")


@contextmanager
def get_db() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(DB_PATH, timeout=10.0)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def query_db(query: str, args: tuple = (), one: bool = False) -> Optional[Any]:
    try:
        with get_db() as conn:
            rv = conn.execute(query, args).fetchall()
        return (rv[0] if rv else None) if one else rv
    except sqlite3.Error:
        logger.exception("Database query failed: %s", query)
        return None if one else []


def execute_db(query: str, args: tuple = ()) -> int:
    with get_db() as conn:
        try:
            cur = conn.execute(query, args)
            conn.commit()
            return cur.lastrowid or 0
        except sqlite3.IntegrityError:
            raise
        except sqlite3.Error:
            logger.exception("Database execution failed: %s", query)
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
        "categories": """CREATE TABLE IF NOT EXISTS categories
             (id INTEGER PRIMARY KEY AUTOINCREMENT,
              family_id INTEGER NOT NULL,
              name TEXT NOT NULL,
              type TEXT NOT NULL DEFAULT 'expense',
              is_default INTEGER DEFAULT 0,
              color TEXT,
              import_source TEXT,
              UNIQUE(family_id, name))""",
    }

    with get_db() as conn:
        for create_sql in schema.values():
            conn.execute(create_sql)

        conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_families_invite_code ON families(invite_code)")
        conn.commit()
