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

4. Set a strong `JWT_SECRET`.

5. Start the server:

```bash
npm run dev
```

Server runs at `http://localhost:5000` by default.

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
| GET | `/api/auth/me` | JWT | Current user profile |
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
- Body (JSON):

```json
{
  "businessName": "Anna Nails",
  "industry": "nail salon"
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

Usage resets automatically when the calendar month changes (checked on each lead submission).
