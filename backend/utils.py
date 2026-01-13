import random
import string
from functools import wraps
from flask import session, jsonify
from backend.database import query_db


def generate_invite_code(length: int = 6) -> str:
    chars = string.ascii_uppercase + string.digits
    return "".join(random.choice(chars) for _ in range(length))


def validate_fields(data: dict, fields: list) -> bool:
    if not data:
        return False
    return all(data.get(f) is not None for f in fields)


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Not authenticated"}), 401
        return f(*args, **kwargs)

    return decorated_function


def get_user_family_id():
    user = query_db("SELECT family_id FROM users WHERE id = ?", (session.get("user_id"),), one=True)
    return user["family_id"] if user else None
