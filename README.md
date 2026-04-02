# FrameFolio UAE — Backend API

Production-grade **FastAPI + PostgreSQL** backend for a photographer marketplace platform.

---

## 🏗 Architecture

```
backend/
├── app/
│   ├── core/           # Config, DB, Security, Exceptions
│   ├── models/         # SQLAlchemy ORM models
│   ├── schemas/        # Pydantic request/response models
│   ├── services/       # Business logic layer
│   ├── api/
│   │   ├── deps.py     # Dependency injection (auth, DB, role guards)
│   │   └── v1/         # Route handlers per domain
│   └── main.py         # FastAPI app factory
├── alembic/            # Database migrations
├── tests/              # Pytest async test suite
├── Dockerfile
├── requirements.txt
└── .env.example
```

---

## 🚀 Getting Started

### 1. Install dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — set DATABASE_URL and SECRET_KEY at minimum
```

### 3. Run PostgreSQL (Docker)

```bash
docker compose up db -d
```

### 4. Run database migrations

```bash
alembic upgrade head
```

### 5. Start the server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API docs: **http://localhost:8000/docs**

---

## 🔑 Authentication

| Flow | Endpoint |
|------|----------|
| Register | `POST /api/v1/auth/register` |
| Login | `POST /api/v1/auth/login` |
| Refresh Token | `POST /api/v1/auth/refresh` |
| Change Password | `POST /api/v1/auth/change-password` |
| Get Current User | `GET /api/v1/auth/me` |

All protected endpoints require: `Authorization: Bearer <access_token>`

---

## 🎭 Roles

| Role | Capabilities |
|------|-------------|
| `client` | Browse photographers, create bookings, send messages, leave reviews |
| `photographer` | Manage profile, set availability, confirm/cancel bookings |
| `admin` | Full platform access: manage users, see all bookings, feature photographers |

---

## 📡 API Endpoints

### Auth — `/api/v1/auth`
- `POST /register` — Register new user
- `POST /login` — Login and get tokens
- `POST /refresh` — Refresh access token
- `POST /change-password` — Change password
- `GET /me` — Get current user

### Photographers — `/api/v1/photographers`
- `GET /` — List & search photographers (public)
- `GET /{profile_id}` — View profile (public)
- `GET /me` — Own profile
- `POST /me` — Create profile
- `PATCH /me` — Update profile
- `POST /me/portfolio` — Add portfolio image
- `DELETE /me/portfolio/{image_id}` — Remove portfolio image

### Bookings — `/api/v1/bookings`
- `POST /` — Create booking (client)
- `GET /` — List my bookings
- `GET /{id}` — Get booking detail
- `PATCH /{id}/status` — Update booking status (state machine)
- `PATCH /{id}` — Update booking details
- `POST /reviews` — Submit review (client, completed bookings only)

### Availability — `/api/v1/availability`
- `GET /{photographer_id}/slots` — Get recurring availability (public)
- `POST /me/slots` — Add availability slot
- `PATCH /me/slots/{id}` — Update slot
- `DELETE /me/slots/{id}` — Delete slot
- `GET /{photographer_id}/exceptions` — Get date exceptions (public)
- `POST /me/exceptions` — Block date
- `DELETE /me/exceptions/{id}` — Remove block

### Messages — `/api/v1/messages`
- `GET /` — List threads
- `POST /` — Start thread
- `GET /{thread_id}` — Get thread + messages
- `POST /{thread_id}/messages` — Send message
- `POST /{thread_id}/read` — Mark as read

### Admin — `/api/v1/admin`
- `GET /users` — List all users (filterable)
- `GET /bookings` — List all bookings (filterable)
- `PATCH /photographers/{id}/feature` — Toggle featured
- `GET /stats` — Platform statistics

---

## 📦 Booking Status State Machine

```
pending → confirmed → in_progress → completed
   ↓          ↓
cancelled_by_client / cancelled_by_photographer
```

---

## 🐳 Docker

```bash
# Full stack (API + PostgreSQL + Redis)
docker compose up --build

# Migrations run automatically on API start
```

---

## 🧪 Tests

```bash
pip install -r requirements-dev.txt
pytest --cov=app tests/
```

---

## 🔧 Creating a Migration

```bash
alembic revision --autogenerate -m "description of change"
alembic upgrade head
```
