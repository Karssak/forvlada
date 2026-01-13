
FROM node:18-alpine as frontend-builder

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install

COPY index.html vite.config.js eslint.config.js ./
COPY components/ components/
COPY js/ js/
COPY style.css ./
COPY script.js ./

RUN npm run build

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .
COPY backend/ backend/

COPY --from=frontend-builder /app/dist /app/static

COPY components/ /app/static/components/

COPY logo.svg /app/static/
COPY style.css /app/static/
COPY script.js /app/static/

RUN mkdir -p data

EXPOSE 5000

ENV FLASK_APP=app.py
ENV PYTHONUNBUFFERED=1

CMD ["python", "app.py"]
