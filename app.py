import os

from backend import create_app
from backend.extensions import socketio

app = create_app()


if __name__ == "__main__":
    debug = os.environ.get("FLASK_ENV") != "production"
    socketio.run(app, host="0.0.0.0", debug=debug, port=5000)
