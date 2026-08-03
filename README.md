# Arun V — Portfolio (Dynamic, SQL-backed)

A personal portfolio site with:
- A **public page** (`index.html`) that lists projects and skills pulled live from a SQL database, plus a contact form.
- A **password-protected admin page** (`admin.html`) to add, edit, and delete projects and skills, and to view/delete contact messages — full CRUD.
- A small **Express + SQLite** backend (no external database server needed — the database is a single file).

Pre-seeded with content from your resume (education, IBM Cloud Intern role, Cloud Resume Challenge project, Event Management System project, and skills).

---

## 1. Requirements

- **Node.js version 22.5 or newer** (you need this specific minimum — see note below). Check with:
  ```bash
  node -v
  ```
  If you need to update, get the latest LTS from https://nodejs.org.

That's it — no MySQL/Postgres install, and no C++ build tools either. The database uses Node's **built-in** `node:sqlite` module instead of a native npm package, so `npm install` only ever downloads plain JavaScript. You'll see a one-line `ExperimentalWarning: SQLite is an experimental feature` when the server starts — that's expected and harmless, not an error.

---

## 2. Project structure

```
portfolio-app/
├── server.js              # Express server + all API routes
├── package.json
├── .env.example            # copy this to .env
├── db/
│   ├── database.js         # creates the SQLite tables
│   ├── seed.js              # populates starter data from your resume
│   └── portfolio.db         # created automatically on first run
└── public/
    ├── index.html           # public site
    ├── admin.html            # admin panel (password-protected)
    ├── css/style.css
    └── js/
        ├── main.js           # public page logic
        └── admin.js           # admin panel logic
```

---

## 3. Setup (step by step)

**Step 1 — Open a terminal in the project folder.**
```bash
cd portfolio-app
```

**Step 2 — Install dependencies.**
```bash
npm install
```
This downloads Express, `express-session`, and `dotenv` into `node_modules/` — all pure JavaScript, nothing to compile.

**Step 3 — Create your environment file.**
```bash
cp .env.example .env
```
Then open `.env` in a text editor and set:
```
ADMIN_PASSWORD=pick-a-real-password-here
SESSION_SECRET=any-long-random-string-here
PORT=3000
```
Do **not** commit `.env` to git — it's already listed in `.gitignore`.

**Step 4 — Create and seed the database.**
```bash
npm run seed
```
You should see:
```
Seeded 2 projects and 10 skills.
```
This creates `db/portfolio.db` with your resume's projects and skills already loaded. You can re-run this command anytime to reset projects/skills back to the starting content (it won't touch contact messages).

**Step 5 — Start the server.**
```bash
npm start
```
You should see:
```
Portfolio server running at http://localhost:3000
```

**Step 6 — Open the site.**
- Public page: http://localhost:3000
- Admin panel: http://localhost:3000/admin.html — log in with the `ADMIN_PASSWORD` you set in `.env`.

---

## 4. Using the admin panel

Once logged in you can:
- **Projects**: add a title, description, comma-separated tech stack (e.g. `AWS, Lambda, S3`), and an optional link. Edit or delete any existing project.
- **Skills**: add a name and a category (e.g. `Cloud`, `Languages`, `Frontend`, `Tools`) — the public page automatically groups skills by category.
- **Messages**: view everything submitted through the public contact form, and delete entries once you've read them.

Changes appear on the public page immediately — no rebuild step, because the page fetches live data from the API each time it loads.

Log out with the button in the top-right of the admin panel; the session also expires automatically after 4 hours.

---

## 5. How the pieces fit together (for learning CRUD)

| Action | HTTP request | Handled in |
|---|---|---|
| List projects/skills (public) | `GET /api/projects`, `GET /api/skills` | `server.js` |
| Create project/skill (admin only) | `POST /api/projects`, `POST /api/skills` | `server.js` |
| Update project/skill (admin only) | `PUT /api/projects/:id`, `PUT /api/skills/:id` | `server.js` |
| Delete project/skill (admin only) | `DELETE /api/projects/:id`, `DELETE /api/skills/:id` | `server.js` |
| Submit contact form (public) | `POST /api/contact` | `server.js` → inserts into `messages` table |
| View/delete messages (admin only) | `GET /api/messages`, `DELETE /api/messages/:id` | `server.js` |

Admin-only routes are protected by a `requireAuth` middleware that checks `req.session.isAdmin`, which is only set after a correct `POST /api/login`.

---

## 6. Troubleshooting

- **"Missing ADMIN_PASSWORD or SESSION_SECRET"** on startup → you skipped Step 3; make sure `.env` exists (not just `.env.example`) and both values are filled in.
- **Port already in use** → change `PORT=3000` in `.env` to something else, e.g. `3001`.
- **Admin login always says "Incorrect password"** → double-check there's no extra space in `.env`, and restart the server after editing `.env` (`Ctrl+C` then `npm start` again — env vars are only read at startup).
- **`Cannot find module 'node:sqlite'` or similar** → your Node version is older than 22.5. Run `node -v` and update from https://nodejs.org if needed.
- **Public page shows "Couldn't load projects"** → the server isn't running, or you opened `index.html` directly as a file instead of via `http://localhost:3000`. Always access the site through the server URL, not by double-clicking the HTML file.

---

## 7. Next steps you could add later

- Hash the admin password with `bcrypt` instead of storing it as plain text in `.env`.
- Add image uploads for projects (store the file, save its path in the `projects` table).
- Add pagination to the messages table once you get a lot of submissions.
- Deploy: the `public/` folder + Express server can run on any Node host (Render, Railway, Fly.io, an EC2 box, etc.) — swap SQLite for a hosted Postgres/MySQL if you need multiple server instances.
