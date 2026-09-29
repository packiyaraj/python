# FastAPI + MongoDB Atlas CRUD API

A beginner-friendly API for creating, listing, reading, updating, and deleting items.

## 1. Create an environment

In the VS Code terminal on Windows:

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

## 2. Configure MongoDB Atlas

Create your local environment file and replace its placeholder values with your Atlas connection details:

```powershell
Copy-Item .env.example .env
```

Do not commit `.env`; it is ignored by Git.

In Atlas, create a database user and allow your current IP address in Network Access. Put the database user credentials and cluster URL into `MONGO_URL`. URL-encode special characters in the username or password. Set `MONGODB_DATABASE` to the database name you want to use.

## 3. Run the API

```powershell
python -m uvicorn main:app --reload
```

Open `http://127.0.0.1:8000/docs` for interactive API documentation. The API starts without Atlas credentials, but item endpoints return a clear configuration error until `MONGO_URL` is set in `.env`.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/` | Health check |
| `POST` | `/items/` | Create an item |
| `GET` | `/items/` | List items |
| `GET` | `/items/{item_id}` | Get one item |
| `PATCH` | `/items/{item_id}` | Update supplied fields |
| `DELETE` | `/items/{item_id}` | Delete an item |

Items have a required `name` and non-negative `price`, and an optional `description`.