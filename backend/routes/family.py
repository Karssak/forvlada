from flask import Blueprint, request, jsonify, session
from werkzeug.security import check_password_hash
from backend.database import query_db, execute_db, get_db
from backend.utils import login_required, get_user_family_id, generate_invite_code
from backend.socket_events import emit_family_event, emit_activity
from backend.extensions import ACTIVITY_BUFFER

family_bp = Blueprint("family", __name__)


@family_bp.route("/api/families", methods=["GET", "POST"])
@login_required
def handle_families():
    
    if request.method == "POST":
        data = request.json or {}
        name = data.get("name")
        if not name:
            return jsonify({"error": "Missing fields"}), 400
        
        # Validate family name
        name = str(name).strip()
        if not name or len(name) > 200:
            return jsonify({"error": "Family name must be 1-200 characters"}), 400

        invite_code = generate_invite_code()
        
        with get_db() as conn:
            family_id = execute_db("INSERT INTO families (name, created_by, invite_code) VALUES (?, ?, ?)", (name, session["user_id"], invite_code))
            conn.execute("UPDATE users SET family_id = ?, role = 'admin' WHERE id = ?", (family_id, session["user_id"]))
            conn.commit()

        emit_activity(family_id, "Family created", f"{name} created", category="family")
        return jsonify({"message": "Family created", "familyId": family_id, "inviteCode": invite_code}), 201

    families = query_db("SELECT * FROM families WHERE created_by = ?", (session["user_id"],))
    return jsonify([dict(row) for row in families])


@family_bp.route("/api/family", methods=["PATCH"])
@login_required
def update_family():
    family_id = get_user_family_id()
    if not family_id:
        return jsonify({"error": "No family found"}), 404

    user = query_db("SELECT role FROM users WHERE id = ?", (session["user_id"],), one=True)
    if not user or user["role"] != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    data = request.json or {}
    name = data.get("name")
    if not name:
        return jsonify({"error": "Missing fields"}), 400
    
    # Validate family name
    name = str(name).strip()
    if not name or len(name) > 200:
        return jsonify({"error": "Family name must be 1-200 characters"}), 400

    execute_db("UPDATE families SET name = ? WHERE id = ?", (name, family_id))
    
    emit_family_event(family_id, "update_family")
    emit_activity(family_id, "Family updated", f"Family name changed to {name}", category="family")
    return jsonify({"message": "Family updated"}), 200


@family_bp.route("/api/families/join", methods=["POST"])
@login_required
def join_family():
    data = request.json or {}
    code = data.get("code") or data.get("inviteCode")
    if not code:
        return jsonify({"error": "Missing invite code"}), 400
    
    # Validate invite code format
    code = str(code).strip().upper()
    if len(code) != 6 or not code.isalnum():
        return jsonify({"error": "Invalid invite code format"}), 400

    with get_db() as conn:
        fam = conn.execute("SELECT id, color FROM families WHERE invite_code = ?", (code,)).fetchone()
        if not fam:
            return jsonify({"error": "Invalid invite code"}), 404
        conn.execute("UPDATE users SET family_id = ? WHERE id = ?", (fam["id"], session["user_id"]))
        conn.commit()

    emit_family_event(fam["id"], "update_members")
    emit_activity(fam["id"], "Member joined", f"{session.get('email','Member')} joined", category="members")
    return jsonify({"message": "Joined family"}), 200


@family_bp.route("/api/family/members", methods=["GET"])
@login_required
def get_family_members():
    family_id = get_user_family_id()
    if not family_id:
        return jsonify({"error": "No family found"}), 404

    family = query_db("SELECT invite_code, color FROM families WHERE id = ?", (family_id,), one=True)
    members = [
        dict(row)
        for row in query_db(
            "SELECT id, first_name, last_name, email, role FROM users WHERE family_id = ?",
            (family_id,),
        )
    ]

    return jsonify(
        {
            "invite_code": family["invite_code"] if family else None,
            "family_color": family["color"] if family else None,
            "members": members,
        }
    )


@family_bp.route("/api/activity", methods=["GET"])
@login_required
def get_activity_history():
    
    family_id = get_user_family_id()
    if not family_id:
        return jsonify({"error": "No family found"}), 404

    events = ACTIVITY_BUFFER.get(family_id, [])
    return jsonify({"familyId": family_id, "events": events})


@family_bp.route("/api/family/members/<int:member_id>", methods=["DELETE"])
@login_required
def remove_member(member_id):
    if member_id == session["user_id"]:
        return jsonify({"error": "Cannot remove yourself"}), 400

    requester = query_db("SELECT family_id, role FROM users WHERE id = ?", (session["user_id"],), one=True)
    if not requester or requester["role"] != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    family_id = requester["family_id"]
    target = query_db(
        "SELECT family_id, role, email, first_name, last_name FROM users WHERE id = ?",
        (member_id,),
        one=True,
    )

    if not target or target["family_id"] != family_id:
        return jsonify({"error": "Member not found in family"}), 404
    if target["role"] == "admin":
        return jsonify({"error": "Cannot remove an admin"}), 403

    execute_db("UPDATE users SET family_id = NULL, role = 'child' WHERE id = ?", (member_id,))

    emit_family_event(family_id, "update_members")
    removed_label = target["email"] or ((target["first_name"] or "") + " " + (target["last_name"] or ""))
    emit_activity(family_id, "Member removed", f"{removed_label} removed", category="members")
    return jsonify({"message": "Member removed"}), 200


@family_bp.route("/api/roles/assign", methods=["POST"])
@login_required
def assign_role():
    data = request.json or {}
    target_user_id = data.get("userId")
    new_role = data.get("role")

    if new_role not in ["admin", "parent", "child"]:
        return jsonify({"error": "Invalid role"}), 400

    if str(target_user_id) == str(session["user_id"]) and new_role != "admin":
        return jsonify({"error": "Cannot remove your own admin role"}), 400

    requester = query_db("SELECT family_id, role FROM users WHERE id = ?", (session["user_id"],), one=True)
    if not requester or requester["role"] != "admin":
        return jsonify({"error": "Unauthorized - Admin only"}), 403

    family_id = requester["family_id"]
    target = query_db(
        "SELECT family_id, email, first_name, last_name FROM users WHERE id = ?",
        (target_user_id,),
        one=True,
    )

    if not target or target["family_id"] != family_id:
        return jsonify({"error": "User not in family"}), 404

    execute_db("UPDATE users SET role = ? WHERE id = ?", (new_role, target_user_id))
    target_label = target["email"] or ((target["first_name"] or "") + " " + (target["last_name"] or ""))
    emit_family_event(family_id, "update_roles")
    emit_activity(family_id, "Role updated", f"{target_label} is now {new_role}", category="roles")
    return jsonify({"message": "Role updated"}), 200


@family_bp.route("/api/family_delete", methods=["DELETE"])
@login_required
def delete_family_route():
    family_id = get_user_family_id()
    if not family_id:
        return jsonify({"error": "No family found"}), 404

    requester = query_db("SELECT role, password FROM users WHERE id = ?", (session["user_id"],), one=True)
    if not requester or requester["role"] != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    data = request.json or {}
    password = data.get("password")
    if not password:
         return jsonify({"error": "Password required"}), 400
    
    if not check_password_hash(requester["password"], password):
         return jsonify({"error": "Invalid password"}), 403

    # Delete family
    with get_db() as conn:
        conn.execute("UPDATE users SET family_id = NULL, role = 'child' WHERE family_id = ?", (family_id,))
        conn.execute("DELETE FROM families WHERE id = ?", (family_id,))
        conn.commit()

    return jsonify({"message": "Family deleted"}), 200
