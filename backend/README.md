# Next Waves Lead API

Backend API for local businesses to collect website inquiries and manage leads.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Set `MONGO_URI` to your MongoDB connection string (local or MongoDB Atlas).

4. Set `JWT_SECRET`, `OAUTH_STATE_SECRET`, and `TOKEN_ENCRYPTION_KEY` to separate long random values. Generate each with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"
   ```

   The server refuses to start if `JWT_SECRET` or `OAUTH_STATE_SECRET` is missing, shorter than 32 characters, still a placeholder, or if both are the same value, and (when Google OAuth is configured) if `TOKEN_ENCRYPTION_KEY` is missing or short. See [Security settings](#security-settings).

5. For Google sign-in and Business Profile, set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `FRONTEND_URL`. In Google Cloud, add these redirect URIs:

   - `http://localhost:5000/api/auth/google/callback`
   - `http://localhost:5000/api/google/business/callback`

   Both Google flows bind the OAuth `state` to the browser that started them with a short-lived, httpOnly `SameSite=Lax` cookie on the API host (`Secure` when `NODE_ENV=production`). Start and callback are top-level visits to the API, so this works when the frontend and API are on different domains. `BACKEND_URL` must be the API's public URL. Google sign-in never puts the JWT in a URL: the frontend exchanges a one-time code at `POST /api/auth/google/exchange`. The Business Profile start ticket is form-posted to the API and is never put in a URL.

6. Start the server:

```bash
npm run dev
```

Server runs at `http://localhost:5000` by default.

## Postman Collection

Import the ready-made collection:

```
backend/postman/Next-Waves-Lead-API.postman_collection.json
```

In Postman: **Import** → select the file → run requests top to bottom. The collection auto-saves `token`, `apiKey`, and `leadId` from responses.

## Quick Test (no MongoDB install needed)

```bash
npm run test:flow
```

Runs the full Postman-style flow against an in-memory MongoDB.

---

## API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | None | Health check |
| POST | `/api/auth/register` | None | Register business owner |
| POST | `/api/auth/login` | None | Login, returns JWT |
| GET | `/api/auth/me` | JWT | Current user profile (includes `hasPassword`) |
| POST | `/api/auth/logout-all` | JWT | Sign out every session on every device |
| PATCH | `/api/auth/password` | JWT | Change password (`currentPassword`, `newPassword` 8-128 chars). Google-only accounts may set one without `currentPassword`. Revokes other sessions and returns a fresh `token` |
| GET | `/api/auth/google` | None | Start Google sign-in |
| GET | `/api/auth/google/callback` | None | Finish Google sign-in; redirects to the frontend with a one-time `code` |
| POST | `/api/auth/google/exchange` | None | Exchange `{ "code" }` for `{ token, user }` (code is single-use, expires in 60s) |
| GET | `/api/google/business/connect` | JWT | Returns `{ url, ticket }`. Form-post `ticket` to `url` within 60s; do not put it in a link |
| POST | `/api/google/business/start` | Ticket in form body | Sets the flow cookie and redirects to Google |
| GET | `/api/google/business/callback` | None | Finish Business Profile connection |
| GET | `/api/google/business/status` | JWT | Connection status |
| GET | `/api/google/business/locations` | JWT | Locations on the connected account |
| POST | `/api/google/business/location` | JWT | Choose a location |
| DELETE | `/api/google/business` | JWT | Disconnect and delete Google tokens |
| POST | `/api/google/business/import` | JWT | Import the selected location |
| POST | `/api/business` | JWT | Create business + API key |
| GET | `/api/business/me` | JWT | Get own business |
| PATCH | `/api/business/me` | JWT | Update business profile |
| POST | `/api/business/regenerate-api-key` | JWT | Generate new API key |
| POST | `/api/leads` | `x-api-key` header | Public lead submission |
| GET | `/api/leads` | JWT | List own leads |
| GET | `/api/leads/:id` | JWT | Get one lead |
| PATCH | `/api/leads/:id/status` | JWT | Update lead status |
| DELETE | `/api/leads/:id` | JWT | Delete lead |
| GET | `/api/analytics/summary` | JWT | Dashboard stats |

---

## Postman Test Flow

Base URL: `http://localhost:5000`

### 1. Register

- **POST** `/api/auth/register`
- Body (JSON):

```json
{
  "name": "Andrew",
  "email": "andrew@example.com",
  "password": "password123"
}
```

### 2. Login

- **POST** `/api/auth/login`
- Body (JSON):

```json
{
  "email": "andrew@example.com",
  "password": "password123"
}
```

Copy the `token` from the response.

### 3. Set Authorization header

For all protected routes, add:

```
Authorization: Bearer <your_token>
```

### 4. Create business

- **POST** `/api/business`
- Only `businessName` is required. Address, phone, website, services, and hours can be saved now or later with `PATCH /api/business/me`.
- Hours use 24-hour `HH:MM` times. Leave a day out, or send it with empty times, when hours are not set. `closed: true` marks that day closed.
- Body (JSON):

```json
{
  "businessName": "Anna Nails",
  "industry": "nail salon",
  "address": "123 Queen St, Toronto",
  "phone": "(416) 555-0199",
  "website": "https://annanails.example",
  "serviceCatalog": [
    { "name": "Manicure", "price": "$45", "description": "Classic manicure" }
  ],
  "businessHours": [
    { "day": "Monday", "open": "09:00", "close": "17:00" },
    { "day": "Sunday", "closed": true }
  ]
}
```

Copy the `apiKey` from the response.

### 5. Submit lead (public — no JWT)

- **POST** `/api/leads`
- Header: `x-api-key: <your_api_key>`
- Body (JSON):

```json
{
  "name": "John Smith",
  "phone": "4161234567",
  "email": "john@example.com",
  "message": "I want to book a manicure this Friday",
  "source": "website"
}
```

### 6. List leads

- **GET** `/api/leads`
- Header: `Authorization: Bearer <token>`

### 7. Update lead status

- **PATCH** `/api/leads/:id/status`
- Header: `Authorization: Bearer <token>`
- Body (JSON):

```json
{
  "status": "contacted"
}
```

Valid statuses: `new`, `contacted`, `booked`, `lost`

### 8. Analytics summary

- **GET** `/api/analytics/summary`
- Header: `Authorization: Bearer <token>`

### Negative tests

- Submit lead with invalid `x-api-key` → `401` `{ "success": false, "message": "Invalid API key" }`
- Submit lead when monthly limit is reached → `403` `{ "success": false, "message": "Monthly lead limit reached" }`
- Access another user's lead by ID → `404`

---

## Plan limits

| Plan | Monthly limit |
|------|---------------|
| free | 100 |
| starter | 1000 |
| pro | 5000 |

Usage resets automatically when the calendar month changes (checked on each lead submission). Each submission reserves its slot atomically, so concurrent submissions can never exceed the limit; a slot is given back if the lead cannot be stored.

---

## Security settings

| Variable | Default | Purpose |
|----------|---------|---------|
| `JWT_SECRET` | required | Signs session JWTs (HS256 only). 32+ random characters. |
| `OAUTH_STATE_SECRET` | required | Signs the 10-minute Google OAuth `state`. Must differ from `JWT_SECRET`. |
| `JWT_EXPIRES_IN` | `7d` | Session lifetime. `POST /api/auth/logout-all` and password changes revoke older tokens immediately. |
| `TRUST_PROXY` | `1` | Reverse-proxy hops in front of the API (Render = 1). Lets rate limits see the real client IP. Use `0`/`false` when the API is reached directly; never `true` in production (clients could spoof `X-Forwarded-For`). |
| `RATE_LIMIT_MAX` | `100` | Requests per 15 min per client IP, all routes. |
| `AUTH_RATE_LIMIT_MAX` | `10` | Per 15 min for login/register (per IP + email), Google code exchange (per IP), and password change (per IP + user). |
| `LEAD_IP_RATE_LIMIT_MAX` | `20` | Public lead submissions per 15 min per client IP. |
| `LEAD_KEY_RATE_LIMIT_MAX` | `30` | Stored leads per 15 min per business (API key), however many IPs are used. |
| `TURNSTILE_SECRET_KEY` | empty (off) | Cloudflare Turnstile secret. When set, public lead submissions need a captcha token. |

### Lead form spam protection

`POST /api/leads` checks, in order: per-IP limit, API key, honeypot, input validation, captcha, per-business limit, monthly quota.

- **Honeypot:** the hosted form has a hidden `company_url` field. If it is filled in, the API answers with the normal `201` success but stores nothing and does not count usage.
- **Captcha (optional):** with `TURNSTILE_SECRET_KEY` set, the API verifies a Turnstile token sent as `turnstileToken` (or `cf-turnstile-response`, in the body or as a header) with Cloudflare. A missing or invalid token gets `403`; if Cloudflare can't be reached the API returns `503` (fails closed). Without the secret, no captcha is required (local dev and existing clients keep working).
- **Direct API integrations:** each business has a `requireCaptcha` setting (default `true`, editable on the Business page or with `PATCH /api/business/me` `{ "requireCaptcha": false }`). A business that posts leads from its own server, which can't solve a captcha, can turn it off. The form key is public, so turning captcha off also removes it from that business's hosted form link. Honeypot and rate limits still apply.
- Cloudflare test keys: site key `1x00000000000000000000AA` with secret `1x0000000000000000000000000000000AA` always passes; secret `2x0000000000000000000000000000000AA` always fails. Use real keys from the Cloudflare dashboard in production.
