# MAI-90

Maintenance & Analysis Intelligence — industrial safety support for aging facilities.

AI recommends. Human operators decide.

---

## Local Setup

```
npm install
Copy-Item .env.example .env
npm start
```

Open `http://localhost:3000` in a browser.

---

## Configuration

`.env.example` is a shared template committed to the repository. It contains safe placeholder values and no secrets. Copy it to `.env` for local use.

`.env` is your local configuration file. It is listed in `.gitignore` and must not be committed. Edit it to change the port, database path, or logs directory.

| Variable   | Default         | Description                       |
|------------|-----------------|-----------------------------------|
| `PORT`     | `3000`          | HTTP server port                  |
| `DB_PATH`  | `./db/mai90.db` | SQLite database file path         |
| `LOGS_PATH`| `./logs`        | Directory for audit and quarantine logs |

---

## Tests

```
npm test
```

Runs validation, license filter, and rule engine tests using the Node.js built-in test runner.
