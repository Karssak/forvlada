import os
from flask import Flask
from .extensions import socketio
from .database import init_db
from .routes import register_routes


def create_app():
        static_folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
        if os.path.exists('/app/static'):
                static_folder = '/app/static'

        app = Flask(__name__, static_folder=static_folder)
        app.secret_key = os.environ.get('SECRET_KEY', 'supersecretkey')
        app.config['SESSION_COOKIE_HTTPONLY'] = True
        app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
        app.config['PERMANENT_SESSION_LIFETIME'] = 86400
        app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

        socketio.init_app(app)

        with app.app_context():
                init_db()

        register_routes(app)

        @app.errorhandler(Exception)
        def handle_exception(e):
                return {"error": str(e)}, 500

        return app
