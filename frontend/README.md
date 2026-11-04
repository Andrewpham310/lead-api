# Next Waves Lead Dashboard

React (Vite) frontend for the Next Waves Lead API.

## Features

- Register and login
- Business profile setup
- View and copy API key
- Leads list with status updates
- Analytics overview dashboard

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Make sure the backend API is running on `http://localhost:5000`.

4. Start the frontend:

```bash
npm run dev
```

Open `http://localhost:5173`.

## Environment

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL (default: `http://localhost:5000`) |
| `VITE_TURNSTILE_SITE_KEY` | Optional Cloudflare Turnstile site key. When set, the public lead form shows a captcha. Set it together with the backend's `TURNSTILE_SECRET_KEY`. Test key: `1x00000000000000000000AA` (always passes). |

## Pages

| Route | Description |
|-------|-------------|
| `/login` | Sign in with email or Google |
| `/register` | Create account or continue with Google |
| `/auth/google/callback` | Completes Google sign-in |
| `/lead-form?key=<apiKey>` | Public lead capture form |
| `/` | Dashboard overview |
| `/leads` | Manage leads |
| `/business` | Business profile, API key, and Google Business Profile |

## Build for production

```bash
npm run build
```

Deploy to Vercel with:

| Setting | Value |
|---------|-------|
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Env | `VITE_API_URL` = your Render API URL (e.g. `https://lead-api-1.onrender.com`); optionally `VITE_TURNSTILE_SITE_KEY` |

[`vercel.json`](vercel.json) rewrites all routes to `index.html` so React Router pages like `/lead-form` work when opened directly.

After deploy, the form link looks like:

```text
https://your-app.vercel.app/lead-form?key=nw_live_...
```
