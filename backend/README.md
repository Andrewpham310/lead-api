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

## Manual Lead Entry & Follow-up Notes

### Design Decisions

**Manual lead entry (`POST /api/leads/owner`):**

- Business owners can create leads directly from the dashboard for non-website sources (phone calls, walk-ins, social media DMs, referrals, etc.)
- The `message` field is **optional** for manual leads (unlike public API submissions)
- Manual leads **do NOT count** toward the monthly API usage limit (only increments `leadCount`, not `usageThisMonth`)
- Source can be any string (preset options: website, instagram, facebook, phone, referral, walk-in, other)

**Lead editing (`PATCH /api/leads/:id`):**

- Owners can edit any field of their own leads: name, phone, email, message, source, status
- Useful for correcting typos or updating information after follow-up calls

**Follow-up notes (`POST /api/leads/:id/notes`, `DELETE /api/leads/:id/notes/:noteId`):**

- Each lead has a timeline of follow-up notes (e.g., "Called, left voicemail")
- Notes are timestamped automatically
- Optional `updateLastContacted` flag updates the lead's `lastContactedAt` field
- Notes are displayed newest first in the UI
- Future enhancement: `nextFollowUpDate` can be used for reminders

**Security:**

- All owner routes validate that the lead belongs to the authenticated user's business
- Cross-business access is blocked (returns 404)

## Source Tracking

Track where every lead comes from to understand which marketing channels are most effective.

**Features:**

1. **Query parameter tracking**: Add `?source=instagram` to form links to automatically tag leads
2. **UTM parameter capture**: Automatically captures `utm_source`, `utm_medium`, `utm_campaign` from public submissions
3. **Referrer tracking**: Captures the referring page URL when available
4. **Source normalization**: All sources are normalized (lowercase, trimmed, max 50 chars) for consistent reporting
5. **Filtering**: Filter leads by source via `GET /api/leads?source=instagram`
6. **Analytics**: View leads-by-source breakdown in `GET /api/analytics/summary`

**Known sources:**

`website`, `instagram`, `facebook`, `google`, `linkedin`, `twitter`, `tiktok`, `email`, `phone`, `referral`, `walk-in`, `other`

**Example form URL with source:**

```
https://yourdomain.com/lead-form?key=nw_live_abc123&source=instagram
```

**Link builder:**

The Business settings page includes an interactive link builder where owners can select a source and copy a ready-made form link for that channel.

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
| GET | `/api/auth/me` | JWT | Current user profile |
| POST | `/api/business` | JWT | Create business + API key |
| GET | `/api/business/me` | JWT | Get own business |
| PATCH | `/api/business/me` | JWT | Update business profile |
| POST | `/api/business/regenerate-api-key` | JWT | Generate new API key |
| POST | `/api/leads` | `x-api-key` header | Public lead submission (counts toward limit) |
| POST | `/api/leads/owner` | JWT | Create lead manually (doesn't count toward limit) |
| GET | `/api/leads` | JWT | List own leads |
| GET | `/api/leads?source=instagram` | JWT | Filter leads by source |
| GET | `/api/leads/:id` | JWT | Get one lead |
| PATCH | `/api/leads/:id` | JWT | Update lead details |
| PATCH | `/api/leads/:id/status` | JWT | Update lead status |
| DELETE | `/api/leads/:id` | JWT | Delete lead |
| POST | `/api/leads/:id/notes` | JWT | Add follow-up note |
| DELETE | `/api/leads/:id/notes/:noteId` | JWT | Delete follow-up note |
| GET | `/api/analytics/summary` | JWT | Dashboard stats with source breakdown |
| GET | `/api/sources` | None | Get list of known source options |

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
