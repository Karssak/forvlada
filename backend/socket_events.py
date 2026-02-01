from flask import request, session
from flask_socketio import join_room
import time
from .extensions import socketio, ACTIVITY_BUFFER
from .database import query_db


def get_family_room(family_id):
    return f"family_{family_id}"


def emit_family_event(family_id, event_name, data=None):
    if data is None:
        data = {}
    data["family_id"] = family_id
    socketio.emit(event_name, data, room=get_family_room(family_id))


def emit_activity(family_id, title, detail="", category="info", user_name="", user_role=""):
    event = {
        "family_id": family_id,
        "title": title,
        "detail": detail,
        "category": category,
        "user_name": user_name,
        "user_role": user_role,
        "ts": int(time.time() * 1000),
    }
    buf = ACTIVITY_BUFFER.setdefault(family_id, [])
    buf.append(event)
    ACTIVITY_BUFFER[family_id] = buf[-50:]
    socketio.emit("activity_event", event, room=get_family_room(family_id))


@socketio.on("connect")
def handle_connect():
    if "user_id" in session:
        user = query_db("SELECT family_id FROM users WHERE id = ?", (session["user_id"],), one=True)
        if user and user["family_id"]:
            family_id = user["family_id"]
            join_room(get_family_room(family_id))
            socketio.emit(
                "activity_sync",
                {"family_id": family_id, "events": ACTIVITY_BUFFER.get(family_id, [])},
                room=request.sid,
            )


@socketio.on("join_family_room")
def handle_join_family_room(data):
    family_id = data.get("family_id")
    if family_id:
        join_room(get_family_room(family_id))
    try:
        fid = int(family_id)
    except (TypeError, ValueError):
        fid = family_id
    socketio.emit(
        "activity_sync",
        {"family_id": fid, "events": ACTIVITY_BUFFER.get(fid, [])},
        room=request.sid,
    )
