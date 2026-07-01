# Next Waves Lead API

Lead collection platform for local businesses.

## Project structure

```
lead-api/
  backend/    Express + MongoDB API
  frontend/   React (Vite) dashboard
```

## Quick start

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # set MONGO_URI and JWT_SECRET
npm run dev
```

API: `http://localhost:5000`

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Dashboard: `http://localhost:5173`

## Docs

- [Backend API & Postman](backend/README.md)
- [Frontend dashboard](frontend/README.md)
