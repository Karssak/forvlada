from flask import Blueprint, request, jsonify, session
from backend.database import get_db, query_db, execute_db
from backend.utils import login_required, get_user_family_id
from backend.socket_events import emit_activity, emit_family_event

budgets_bp = Blueprint("budgets", __name__)


@budgets_bp.route("/api/budgets", methods=["GET", "POST"])
@login_required
def handle_budgets():
    family_id = get_user_family_id()
    if not family_id:
        return jsonify({"error": "No family found"}), 404

    if request.method == "POST":
        user = query_db("SELECT role FROM users WHERE id = ?", (session["user_id"],), one=True)
        if user and user["role"] == "child":
             return jsonify({"error": "Children cannot create budgets"}), 403

        data = request.json or {}
        category = data.get("category")
        amount = data.get("amount")
        period = data.get("period", "monthly")

        if category is None or amount is None:
            return jsonify({"error": "Missing fields"}), 400
        
        category = str(category).strip()
        if not category or len(category) > 100:
            return jsonify({"error": "Category must be 1-100 characters"}), 400
        
        try:
            amount = float(amount)
            if amount <= 0 or amount > 999999999:
                return jsonify({"error": "Amount must be between 0 and 999,999,999"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid amount format"}), 400
        
        if period not in ["daily", "weekly", "monthly", "yearly"]:
            return jsonify({"error": "Period must be daily, weekly, monthly, or yearly"}), 400

        with get_db() as conn:
            cat_row = conn.execute(
                "SELECT id, name FROM categories WHERE family_id = ? AND LOWER(name) = LOWER(?)",
                (family_id, category),
            ).fetchone()
            if not cat_row:
                default_color = "#FF5722"
                conn.execute(
                    "INSERT INTO categories (family_id, name, type, is_default, color) VALUES (?, ?, 'expense', 0, ?)",
                    (family_id, category, default_color),
                )
                conn.commit()
                cat_row = conn.execute(
                    "SELECT id, name FROM categories WHERE family_id = ? AND LOWER(name) = LOWER(?)",
                    (family_id, category),
                ).fetchone()

            canonical_name = cat_row["name"] if cat_row else category

            existing = conn.execute(
                "SELECT id FROM budgets WHERE family_id = ? AND category = ?",
                (family_id, canonical_name),
            ).fetchone()
            if existing:
                conn.execute(
                    "UPDATE budgets SET amount = ?, period = ? WHERE id = ?",
                    (amount, period, existing["id"]),
                )
            else:
                conn.execute(
                    "INSERT INTO budgets (family_id, category, amount, period) VALUES (?, ?, ?, ?)",
                    (family_id, canonical_name, amount, period),
                )
            conn.commit()

        emit_family_event(family_id, "update_budgets")
        emit_activity(
            family_id,
            "Budget updated",
            f"{category} set to ${amount}/{period}",
            category="budgets",
        )
        return jsonify({"message": "Budget updated"}), 201

    query = """
    SELECT b.id, b.category, b.amount as "limit", b.period, COALESCE(SUM(t.amount), 0) as spent
    FROM budgets b
    LEFT JOIN transactions t ON t.family_id = b.family_id AND t.category = b.category AND t.type = 'expense'
    WHERE b.family_id = ?
    GROUP BY b.id
    """
    budgets = query_db(query, (family_id,))

    result = [dict(row) for row in budgets]
    return jsonify(result)


@budgets_bp.route("/api/budgets/<int:budget_id>", methods=["DELETE"])
@login_required
def delete_budget(budget_id):
    family_id = get_user_family_id()
    if not family_id:
        return jsonify({"error": "No family found"}), 404

    user = query_db("SELECT role FROM users WHERE id = ?", (session["user_id"],), one=True)
    if user and user["role"] == "child":
        return jsonify({"error": "Children cannot delete budgets"}), 403

    budget = query_db("SELECT category FROM budgets WHERE id = ? AND family_id = ?", (budget_id, family_id), one=True)
    if not budget:
        return jsonify({"error": "Budget not found"}), 404

    execute_db("DELETE FROM budgets WHERE id = ?", (budget_id,))
    
    emit_family_event(family_id, "update_budgets")
    emit_activity(
        family_id,
        "Budget deleted",
        f"Budget for {budget['category']} removed",
        category="budgets"
    )
    return jsonify({"message": "Budget deleted"}), 200
