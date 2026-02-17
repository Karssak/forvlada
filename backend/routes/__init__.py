from .auth import auth_bp
from .family import family_bp
from .user import user_bp
from .transactions import transactions_bp
from .goals import goals_bp
from .budgets import budgets_bp
from .common import common_bp
from .categories import categories_bp


def register_routes(app):
    app.register_blueprint(auth_bp)
    app.register_blueprint(family_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(transactions_bp)
    app.register_blueprint(goals_bp)
    app.register_blueprint(budgets_bp)
    app.register_blueprint(common_bp)
    app.register_blueprint(categories_bp)
