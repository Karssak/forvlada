from flask import Blueprint, request, jsonify, session
from backend.database import get_db, execute_db, query_db
from backend.utils import login_required, get_user_family_id
from backend.socket_events import emit_activity, emit_family_event

goals_bp = Blueprint("goals", __name__)


@goals_bp.route("/api/goals", methods=["GET", "POST"])
@login_required
def handle_goals():
        family_id = get_user_family_id()
        if not family_id:
                return jsonify({"error": "No family found"}), 404

        if request.method == "POST":
                user = query_db("SELECT role FROM users WHERE id = ?", (session["user_id"],), one=True)
                if user and user["role"] == "child":
                        return jsonify({"error": "Children cannot create goals"}), 403

                data = request.json or {}
                name = data.get("name")
                target_amount = data.get("targetAmount")
                current_amount = data.get("currentAmount", 0)
                deadline = data.get("deadline")

                if name is None or target_amount is None:
                        return jsonify({"error": "Missing fields"}), 400
                
                # Validate name
                name = str(name).strip()
                if not name or len(name) > 200:
                        return jsonify({"error": "Goal name must be 1-200 characters"}), 400
                
                # Validate target amount
                try:
                        target_amount = float(target_amount)
                        if target_amount <= 0 or target_amount > 999999999:
                                return jsonify({"error": "Target amount must be between 0 and 999,999,999"}), 400
                except (ValueError, TypeError):
                        return jsonify({"error": "Invalid target amount"}), 400
                
                # Validate current amount
                try:
                        current_amount = float(current_amount)
                        if current_amount < 0 or current_amount > target_amount:
                                current_amount = min(max(0, current_amount), target_amount)
                except (ValueError, TypeError):
                        current_amount = 0

                execute_db(
                        "INSERT INTO goals (family_id, name, target_amount, current_amount, deadline) VALUES (?, ?, ?, ?, ?)",
                        (family_id, name, target_amount, current_amount, deadline),
                )

                emit_family_event(family_id, "update_goals")
                emit_activity(
                        family_id,
                        "Goal created",
                        f"{name} target ${target_amount}",
                        category="goals",
                )
                return jsonify({"message": "Goal added"}), 201

        goals = query_db("SELECT * FROM goals WHERE family_id = ?", (family_id,))
        return jsonify([dict(row) for row in goals])


@goals_bp.route("/api/goals/<int:goal_id>/adjust", methods=["POST"])
@login_required
def adjust_goal(goal_id):
        data = request.json or {}
        amount = data.get("amount")
        action = data.get("action", "add")
        
        # Validate goal_id
        if goal_id <= 0:
                return jsonify({"error": "Invalid goal ID"}), 400
        
        # Validate action
        if action not in ["add", "subtract"]:
                return jsonify({"error": "Action must be 'add' or 'subtract'"}), 400

        if amount is None:
                return jsonify({"error": "Amount is required"}), 400

        try:
                amount = float(amount)
                if amount <= 0 or amount > 999999999:
                        return jsonify({"error": "Amount must be between 0 and 999,999,999"}), 400
        except (ValueError, TypeError):
                return jsonify({"error": "Invalid amount format"}), 400

        with get_db() as conn:
                family_id = get_user_family_id()
                if not family_id:
                        return jsonify({"error": "No family found"}), 404

                goal = conn.execute(
                        "SELECT * FROM goals WHERE id = ? AND family_id = ?", (goal_id, family_id)
                ).fetchone()
                if not goal:
                        return jsonify({"error": "Goal not found"}), 404

                current_amount = goal["current_amount"] or 0
                target_amount = goal["target_amount"] or 0
                delta = amount if action == "add" else -amount
                new_amount = max(0, min(current_amount + delta, target_amount))

                conn.execute("UPDATE goals SET current_amount = ? WHERE id = ?", (new_amount, goal_id))
                conn.commit()

        emit_family_event(family_id, "update_goals")
        emit_activity(
                family_id,
                "Goal updated",
                f"{goal['name']} adjusted by {amount} ({action})",
                category="goals",
        )
        return jsonify({"message": "Goal updated", "goalId": goal_id, "currentAmount": new_amount}), 200

