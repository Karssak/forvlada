from flask import Blueprint, request, jsonify, session
from backend.database import execute_db, query_db
from backend.utils import login_required, get_user_family_id
from backend.socket_events import emit_activity, emit_family_event

transactions_bp = Blueprint("transactions", __name__)


@transactions_bp.route("/api/transactions", methods=["GET", "POST"])
@login_required
def handle_transactions():
        family_id = get_user_family_id()
        if not family_id:
                return jsonify({"error": "No family found"}), 404

        if request.method == "POST":
                data = request.json or {}
                amount = data.get("amount")
                description = data.get("description")
                tx_type = data.get("type")
                category = data.get("category")
                is_recurring = 1 if data.get("isRecurring") else 0
                recurrence = data.get("recurrence")
                next_due_date = data.get("nextDueDate")

                if amount is None or description is None or tx_type is None:
                        return jsonify({"error": "Missing fields"}), 400
                
                # Validate amount
                try:
                        amount = float(amount)
                        if amount <= 0 or amount > 999999999:
                                return jsonify({"error": "Amount must be between 0 and 999,999,999"}), 400
                except (ValueError, TypeError):
                        return jsonify({"error": "Invalid amount format"}), 400
                
                # Validate description
                description = str(description).strip()
                if not description or len(description) > 500:
                        return jsonify({"error": "Description must be 1-500 characters"}), 400
                
                # Validate transaction type
                if tx_type not in ["income", "expense"]:
                        return jsonify({"error": "Type must be 'income' or 'expense'"}), 400
                
                # Sanitize category
                category = str(category).strip() if category else "General"
                if len(category) > 100:
                        category = category[:100]

                execute_db(
                        """
                        INSERT INTO transactions
                        (user_id, family_id, amount, description, type, category, is_recurring, recurrence, next_due_date)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                                session["user_id"],
                                family_id,
                                amount,
                                description,
                                tx_type,
                                category,
                                is_recurring,
                                recurrence,
                                next_due_date,
                        ),
                )

                emit_family_event(family_id, "update_transactions")
                emit_family_event(family_id, "update_budgets")
                emit_activity(
                        family_id,
                        "Transaction added",
                        f"{session.get('email','Member')} logged {tx_type} ${amount} · {description}",
                        category="transactions",
                )
                return jsonify({"message": "Transaction added"}), 201

        transactions = query_db(
                """
                SELECT t.*, u.first_name, u.role
                FROM transactions t
                JOIN users u ON t.user_id = u.id
                WHERE t.family_id = ?
                ORDER BY t.date DESC
                """,
                (family_id,),
        )
        return jsonify([dict(row) for row in transactions])


@transactions_bp.route("/api/transactions/<int:transaction_id>", methods=["DELETE"])
@login_required
def delete_transaction(transaction_id):
    family_id = get_user_family_id()
    if not family_id:
        return jsonify({"error": "No family found"}), 404

    # Check if transaction exists and belongs to family
    tx = query_db(
        "SELECT * FROM transactions WHERE id = ? AND family_id = ?",
        (transaction_id, family_id),
        one=True
    )
    if not tx:
        return jsonify({"error": "Transaction not found"}), 404
        
    execute_db("DELETE FROM transactions WHERE id = ?", (transaction_id,))
    
    emit_family_event(family_id, "update_transactions")
    emit_family_event(family_id, "update_budgets")
    return jsonify({"message": "Transaction deleted"}), 200
