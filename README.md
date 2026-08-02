# Lumora

Family budget tracker: shared transactions, budgets, savings goals, and roles (admin/parent/child), synced live across family members via WebSockets.

## Stack

- **Backend:** Flask, Flask-SocketIO (eventlet), SQLite
- **Frontend:** vanilla JS (ES modules), Tailwind, Chart.js, Vite for bundling

## Run with Docker

```bash
docker compose up --build
```

App is served at `http://localhost:5000`. SQLite data persists in `./data` (mounted volume).

Set a persistent session secret in production:

```bash
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
FLASK_ENV=production SECRET_KEY=$SECRET_KEY docker compose up --build
```

Without `FLASK_ENV=production`, a random `SECRET_KEY` is generated on each start (fine for local use, but sessions won't survive a restart and won't work across multiple instances).

## Local development

```bash
# backend
pip install -r requirements.txt
python app.py            # http://localhost:5000

# frontend (separate terminal)
npm install
npm run dev               # http://localhost:5173, proxies /api and /socket.io to :5000
```

## Project layout

```
backend/            Flask app: routes, DB access, socket events
js/, components/    Frontend: router, API/socket client, per-page UI modules, HTML partials
index.html, style.css, script.js   App shell
```
