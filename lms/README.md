# LMS Student Portal

This project includes:

- React + TypeScript frontend in `frontend/`
- FastAPI backend in `backend/app/`
- MySQL-backed database

## Quick start

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
copy .env.example .env
```

Before starting the backend, create the MySQL database and update `DATABASE_URL`
in `backend/.env` with your MySQL credentials. The example URL expects a local
MySQL server and a database named `lms_db`. For example:

```sql
CREATE DATABASE lms_db CHARACTER SET utf8mb4;
```

For administrator sign-in, set `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD` in
`backend/.env`, then restart the backend. Admin accounts are configured through
these environment variables; the password is not stored in the database.

To copy the existing `backend/lms.db` data into an empty MySQL database, run
this once from `backend/` after configuring `.env`:

```bash
.venv\Scripts\python -m app.migrate_sqlite
```

The migration creates the LMS tables if needed, preserves existing primary keys,
and stops if the target tables already contain data. It does not modify or
delete the SQLite source file. An alternate SQLite file can be supplied as an
argument.

Start the backend after database setup (and the optional data migration):

```bash
.venv\Scripts\python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```

### Demo login

- Email: student@lms.com
- Password: Student@123

The backend seeds demo records when the target database is empty. The SQLite
database is retained as a migration source; the application connects to MySQL
using `DATABASE_URL` in `.env`.
