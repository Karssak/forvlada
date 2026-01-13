import os
from flask import Blueprint, send_from_directory, current_app

common_bp = Blueprint("common", __name__)

@common_bp.route("/")
def index():
    return send_from_directory(current_app.static_folder, "index.html")

@common_bp.route("/<path:path>")
def serve_static(path):
    file_path = os.path.join(current_app.static_folder, path)
    if os.path.exists(file_path):
        return send_from_directory(current_app.static_folder, path)
    return send_from_directory(current_app.static_folder, "index.html")
