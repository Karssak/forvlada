import logging
import os
import secrets

from flask import Flask
from werkzeug.exceptions import HTTPException

from .extensions import socketio
from .database import init_db
from .routes import register_routes

logger = logging.getLogger(__name__)


def create_app():
    static_folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
    if os.path.exists("/app/static"):
        static_folder = "/app/static"

    is_production = os.environ.get("FLASK_ENV") == "production"

    secret_key = os.environ.get("SECRET_KEY")
    if not secret_key:
        if is_production:
            raise RuntimeError("SECRET_KEY environment variable must be set in production")
        secret_key = secrets.token_hex(32)

    app = Flask(__name__, static_folder=static_folder)
    app.secret_key = secret_key
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
    app.config["SESSION_COOKIE_SECURE"] = is_production
    app.config["PERMANENT_SESSION_LIFETIME"] = 86400
    app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024

    socketio.init_app(app)

    with app.app_context():
        init_db()

    register_routes(app)

    @app.errorhandler(HTTPException)
    def handle_http_exception(e):
        return {"error": e.description}, e.code

    @app.errorhandler(Exception)
    def handle_exception(e):
        logger.exception("Unhandled exception")
        return {"error": "Internal server error"}, 500

    return app
