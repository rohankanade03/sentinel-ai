# CivicFlow Backend

Node, Express, MongoDB, and Socket.IO backend for CivicFlow.

## Run

```bash
npm run dev:backend
```

The API runs at `http://localhost:8787`.

## Database

MongoDB is the source of truth. Set `MONGODB_URI` before running the backend.
For local development, this project uses:

```text
mongodb://127.0.0.1:27017/civicflow
```

If you used the local development store before installing MongoDB, migrate it
once with:

```bash
npm run migrate:local-to-mongo
```

Then run:

```bash
npm run start:backend
```

## Main Routes

- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/complaints`
- `GET /api/audit`
- `POST /api/complaints`
- `GET /api/tickets/:ticketId`
- `GET /api/citizen/progress/:ticketId`
- `GET /api/complaints/:ticketId/audit`
- `POST /api/complaints/:ticketId/audit`
- `PATCH /api/admin/complaints/:ticketId/status`

## Privacy

Citizen names and phone numbers are masked before they are returned by API
responses. Audit logs store officer action metadata, status transitions, notes,
and timestamps for traceability.

## Architecture

- Controllers call modular services only.
- Services coordinate repositories, timelines, audit logs, notifications, SLA
  state, and Socket.IO events.
- Repositories own Mongoose access for reusable complaint, user, notification,
  timeline, audit, and analytics queries.
