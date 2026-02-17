from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from backend.database import execute_db, query_db
from backend.utils import validate_fields
import sqlite3

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/api/register", methods=["POST"])
def register():
        data = request.json or {}
        fields = ["firstName", "lastName", "email", "password"]

        if not validate_fields(data, fields):
                return jsonify({"error": "Missing fields"}), 400
        
        first_name = str(data["firstName"]).strip()
        last_name = str(data["lastName"]).strip()
        if not first_name or len(first_name) > 100:
                return jsonify({"error": "First name must be 1-100 characters"}), 400
        if not last_name or len(last_name) > 100:
                return jsonify({"error": "Last name must be 1-100 characters"}), 400
        
        email = str(data["email"]).strip().lower()
        if not email or len(email) > 255 or "@" not in email or "." not in email.split("@")[1]:
                return jsonify({"error": "Invalid email format"}), 400
        
        password = data["password"]
        if len(password) < 6 or len(password) > 128:
                return jsonify({"error": "Password must be 6-128 characters"}), 400

        hashed_password = generate_password_hash(password)

        try:
                user_id = execute_db(
                        "INSERT INTO users (first_name, last_name, email, password) VALUES (?, ?, ?, ?)",
                        (first_name, last_name, email, hashed_password),
                )
                session["user_id"] = user_id
                session["email"] = email
                return jsonify({"message": "User registered successfully"}), 201
        except sqlite3.IntegrityError:
                return jsonify({"error": "Email already exists"}), 409


@auth_bp.route("/api/login", methods=["POST"])
def login():
        data = request.json or {}
        email, password = data.get("email"), data.get("password")
        
        if not email or not password:
                return jsonify({"error": "Email and password required"}), 400
        
        email = str(email).strip().lower()
        if len(email) > 255:
                return jsonify({"error": "Invalid credentials"}), 401

        user = query_db("SELECT id, password FROM users WHERE email = ?", (email,), one=True)

        if user and check_password_hash(user["password"], password):
                session["user_id"] = user["id"]
                session["email"] = email
                return jsonify({"message": "Login successful"}), 200

        return jsonify({"error": "Invalid credentials"}), 401


@auth_bp.route("/api/logout", methods=["POST"])
def logout():
        session.pop("user_id", None)
        session.pop("email", None)
        return jsonify({"message": "Logged out"}), 200
