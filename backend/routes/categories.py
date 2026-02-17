from flask import Blueprint, request, jsonify, session
from backend.database import execute_db, query_db
from backend.utils import login_required, get_user_family_id
from backend.socket_events import emit_family_event, emit_activity

categories_bp = Blueprint("categories", __name__)


@categories_bp.route("/api/categories", methods=["GET", "POST"])
@login_required
def handle_categories():
    family_id = get_user_family_id()
    if not family_id:
        return jsonify({"error": "No family found"}), 404

    if request.method == "POST":
        user = query_db("SELECT role FROM users WHERE id = ?", (session["user_id"],), one=True)
        if user and user["role"] == "child":
             return jsonify({"error": "Children cannot create categories"}), 403

        data = request.json or {}
        name = data.get("name")
        type_val = data.get("type", "expense")
        color = data.get("color", "#CCCCCC")
        
        if not name:
            return jsonify({"error": "Category name is required"}), 400

        name = str(name).strip()
        if len(name) > 50:
            return jsonify({"error": "Name too long"}), 400

        rows = query_db("SELECT id FROM categories WHERE family_id = ? AND name = ?", (family_id, name))
        if rows:
            return jsonify({"error": "Category already exists"}), 400

        execute_db(
            "INSERT INTO categories (family_id, name, type, color, is_default) VALUES (?, ?, ?, ?, 0)",
            (family_id, name, type_val, color)
        )
        return jsonify({"success": True}), 201

    cats = query_db("SELECT * FROM categories WHERE family_id = ?", (family_id,))
    return jsonify([dict(row) for row in cats])


@categories_bp.route("/api/categories/<int:cat_id>", methods=["PUT", "DELETE"])
@login_required
def modify_category(cat_id):
    family_id = get_user_family_id()
    if not family_id:
        return jsonify({"error": "No family found"}), 404

    cat = query_db("SELECT * FROM categories WHERE id = ? AND family_id = ?", (cat_id, family_id), one=True)
    if not cat:
        return jsonify({"error": "Category not found"}), 404

    user = query_db("SELECT role FROM users WHERE id = ?", (session["user_id"],), one=True)
    if user and user["role"] == "child":
         return jsonify({"error": "Children cannot modify categories"}), 403

    if request.method == "PUT":
        data = request.json or {}

        new_name = data.get("name")
        if new_name:
            new_name = str(new_name).strip()
        updated_name = new_name if new_name else cat["name"]
        updated_color = data.get("color", cat["color"])
        updated_type = data.get("type", cat["type"])

        if new_name and new_name != cat["name"]:
            existing = query_db("SELECT id FROM categories WHERE family_id = ? AND name = ?", (family_id, new_name))
            if existing:
                return jsonify({"error": "Category name already exists"}), 400

            execute_db("UPDATE transactions SET category = ? WHERE family_id = ? AND category = ?", (updated_name, family_id, cat["name"]))
            execute_db("UPDATE budgets SET category = ? WHERE family_id = ? AND category = ?", (updated_name, family_id, cat["name"]))

        if updated_type and updated_type != cat["type"]:
            execute_db("UPDATE transactions SET type = ? WHERE family_id = ? AND category = ?", (updated_type, family_id, cat["name"]))

        execute_db("UPDATE categories SET name = ?, color = ?, type = ? WHERE id = ?", 
                   (updated_name, updated_color, updated_type, cat_id))

        emit_family_event(family_id, "update_categories")
        emit_family_event(family_id, "update_transactions")
        emit_family_event(family_id, "update_budgets")
        emit_activity(family_id, "Category updated", f"{updated_name} ({updated_type})", category="categories")

        return jsonify({"success": True})

    if request.method == "DELETE":
        execute_db("UPDATE transactions SET category = 'Others' WHERE family_id = ? AND category = ?", (family_id, cat["name"]))
        execute_db("UPDATE budgets SET category = 'Others' WHERE family_id = ? AND category = ?", (family_id, cat["name"]))
        
        execute_db("DELETE FROM categories WHERE id = ?", (cat_id,))
        return jsonify({"success": True})
