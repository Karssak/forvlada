<div align="center">
  <img src="logo.svg" width="72" alt="Lumora" />

  # Lumora

  Family budget tracker with live sync across members.

  ![Python](https://img.shields.io/badge/python-3.12-155DFC?logo=python&logoColor=white)
  ![Flask](https://img.shields.io/badge/flask-3.0-155DFC?logo=flask&logoColor=white)
  ![Socket.IO](https://img.shields.io/badge/socket.io-realtime-155DFC?logo=socketdotio&logoColor=white)
  ![Vite](https://img.shields.io/badge/vite-5.0-155DFC?logo=vite&logoColor=white)
  ![Docker](https://img.shields.io/badge/docker-ready-155DFC?logo=docker&logoColor=white)
</div>

---

## Contents

- [Overview](#overview)
- [Stack](#stack)
- [Architecture](#architecture)
- [Quick start](#quick-start)
- [Local development](#local-development)
- [Configuration](#configuration)
- [Scripts](#scripts)

## Overview

Shared transactions, budgets, and savings goals for a household. Role-based
access (`admin` / `parent` / `child`) restricts what each member can see and
change. Updates from any member — a new transaction, a budget edit — push to
everyone else's session immediately over WebSockets.

## Stack

| Layer    | Tech                                                 |
|----------|-------------------------------------------------------|
| Backend  | Flask, Flask-SocketIO (eventlet), SQLite                |
| Frontend | Vanilla JS (ES modules), Tailwind CSS, Chart.js, Vite     |
| Realtime | Socket.IO                                                 |


## Quick start

```bash
docker compose up --build
```

Serves at `http://localhost:5000`. SQLite data persists in `./data` (bind-mounted volume).



## Local development

```bash
# backend
pip install -r requirements.txt
python app.py              # http://localhost:5000

# frontend, separate terminal
npm install
npm run dev                  # http://localhost:5173, proxies /api and /socket.io to :5000
```

## Configuration

| Variable     | Default          | Purpose                                                     |
|--------------|--------------------|------------------------------------------------------------------|
| `FLASK_ENV`  | unset (dev)          | `production` enables secure cookies, requires `SECRET_KEY`         |
| `SECRET_KEY` | random per start      | Flask session signing key                                            |
| `DATA_DIR`   | `./data`                | SQLite database location                                                |

## Scripts

```bash
npm run build     # production frontend bundle (Vite)
npm run preview   # preview the production build
```
