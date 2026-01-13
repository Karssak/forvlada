from flask import Blueprint, request, jsonify
from backend.database import get_db, query_db
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
        data = request.json or {}
        category = data.get("category")
        amount = data.get("amount")
        period = data.get("period", "monthly")

        if category is None or amount is None:
            return jsonify({"error": "Missing fields"}), 400
        
        # Validate category
        category = str(category).strip()
        if not category or len(category) > 100:
            return jsonify({"error": "Category must be 1-100 characters"}), 400
        
        # Validate amount
        try:
            amount = float(amount)
            if amount <= 0 or amount > 999999999:
                return jsonify({"error": "Amount must be between 0 and 999,999,999"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid amount format"}), 400
        
        # Validate period
        if period not in ["daily", "weekly", "monthly", "yearly"]:
            return jsonify({"error": "Period must be daily, weekly, monthly, or yearly"}), 400

        with get_db() as conn:
            existing = conn.execute(
                "SELECT id FROM budgets WHERE family_id = ? AND category = ?",
                (family_id, category),
            ).fetchone()
            if existing:
                conn.execute(
                    "UPDATE budgets SET amount = ?, period = ? WHERE id = ?",
                    (amount, period, existing["id"]),
                )
            else:
                conn.execute(
                    "INSERT INTO budgets (family_id, category, amount, period) VALUES (?, ?, ?, ?)",
                    (family_id, category, amount, period),
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
