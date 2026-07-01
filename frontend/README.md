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

## Pages

| Route | Description |
|-------|-------------|
| `/login` | Sign in |
| `/register` | Create account |
| `/lead-form?key=<apiKey>` | Public lead capture form |
| `/` | Dashboard overview |
| `/leads` | Manage leads |
| `/business` | Business profile and API key |

## Build for production

```bash
npm run build
```

Deploy the `dist/` folder to Vercel and set `VITE_API_URL` to your Render backend URL.
