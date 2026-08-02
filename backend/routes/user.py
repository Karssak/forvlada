from flask import Blueprint, jsonify, request, session
from werkzeug.security import check_password_hash, generate_password_hash

from backend.database import execute_db, query_db
from backend.socket_events import emit_activity, emit_family_event
from backend.utils import get_user_family_id, login_required, validate_fields

user_bp = Blueprint("user", __name__)


@user_bp.route("/api/me", methods=["GET"])
@login_required
def me():
    user = query_db(
        """
        SELECT u.first_name, u.last_name, u.email, u.family_id, u.role,
               f.name as family_name, f.color as family_color, f.invite_code
        FROM users u
        LEFT JOIN families f ON u.family_id = f.id
        WHERE u.id = ?
        """,
        (session["user_id"],),
        one=True,
    )

    if user:
        return jsonify(
            {
                "id": session["user_id"],
                "firstName": user["first_name"],
                "lastName": user["last_name"],
                "email": user["email"],
                "role": user["role"],
                "familyId": user["family_id"],
                "familyName": user["family_name"],
                "familyColor": user["family_color"],
                "inviteCode": user["invite_code"],
            }
        )
    return jsonify({"error": "User not found"}), 404


@user_bp.route("/api/me", methods=["PUT"])
@login_required
def update_profile():
    data = request.json or {}
    fields = ["firstName", "lastName", "email"]

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

    if query_db(
        "SELECT id FROM users WHERE email = ? AND id != ?",
        (email, session["user_id"]),
        one=True,
    ):
        return jsonify({"error": "Email already in use"}), 409

    execute_db(
        "UPDATE users SET first_name = ?, last_name = ?, email = ? WHERE id = ?",
        (first_name, last_name, email, session["user_id"]),
    )
    session["email"] = email

    family_id = get_user_family_id()
    if family_id:
        emit_family_event(family_id, "update_members")
    emit_activity(
        family_id,
        "Profile updated",
        f"{email} refreshed their profile",
        category="members",
    )
    return jsonify({"message": "Profile updated"}), 200


@user_bp.route("/api/me/password", methods=["PUT"])
@login_required
def update_password():
    data = request.json or {}
    current_password, new_password = data.get("currentPassword"), data.get("newPassword")

    if not isinstance(current_password, str) or not isinstance(new_password, str):
        return jsonify({"error": "Missing fields"}), 400
    if len(new_password) < 6 or len(new_password) > 128:
        return jsonify({"error": "New password must be 6-128 characters"}), 400

    user = query_db("SELECT password FROM users WHERE id = ?", (session["user_id"],), one=True)
    if not user or not check_password_hash(user["password"], current_password):
        return jsonify({"error": "Current password is incorrect"}), 400

    hashed_password = generate_password_hash(new_password)
    execute_db("UPDATE users SET password = ? WHERE id = ?", (hashed_password, session["user_id"]))
    return jsonify({"message": "Password updated"}), 200

