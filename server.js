// server.js
// Main entry point. Serves the static site from /public and exposes a small
// JSON API backed by SQLite for projects, skills, and contact messages.

require("dotenv").config();
const path = require("path");
const express = require("express");
const session = require("express-session");
const db = require("./db/database");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!ADMIN_PASSWORD || !SESSION_SECRET) {
  console.error(
    "Missing ADMIN_PASSWORD or SESSION_SECRET.\n" +
      "Copy .env.example to .env and fill in both values before starting the server."
  );
  process.exit(1);
}

app.use(express.json());
app.use(
  session({
    name: "portfolio.sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 4, // 4 hours
    },
  })
);
app.use(express.static(path.join(__dirname, "public")));

// ---------- Auth helpers ----------

function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: "Not authenticated." });
}

// ---------- Auth routes ----------

app.post("/api/login", (req, res) => {
  const { password } = req.body || {};
  if (typeof password !== "string" || password.length === 0) {
    return res.status(400).json({ error: "Password is required." });
  }
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Incorrect password." });
  }
  req.session.isAdmin = true;
  res.json({ ok: true });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("portfolio.sid");
    res.json({ ok: true });
  });
});

app.get("/api/check-auth", (req, res) => {
  res.json({ isAdmin: Boolean(req.session && req.session.isAdmin) });
});

// ---------- Projects ----------

app.get("/api/projects", (req, res) => {
  const rows = db.prepare("SELECT * FROM projects ORDER BY id DESC").all();
  res.json(rows);
});

app.post("/api/projects", requireAuth, (req, res) => {
  const { title, description = "", tech_stack = "", link = "" } = req.body || {};
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Title is required." });
  }
  const result = db
    .prepare(
      "INSERT INTO projects (title, description, tech_stack, link) VALUES (?, ?, ?, ?)"
    )
    .run(title.trim(), description, tech_stack, link);
  const created = db.prepare("SELECT * FROM projects WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(created);
});

app.put("/api/projects/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "Project not found." });

  const {
    title = existing.title,
    description = existing.description,
    tech_stack = existing.tech_stack,
    link = existing.link,
  } = req.body || {};

  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Title is required." });
  }

  db.prepare(
    "UPDATE projects SET title = ?, description = ?, tech_stack = ?, link = ? WHERE id = ?"
  ).run(title.trim(), description, tech_stack, link, id);

  const updated = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
  res.json(updated);
});

app.delete("/api/projects/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  const result = db.prepare("DELETE FROM projects WHERE id = ?").run(id);
  if (result.changes === 0) return res.status(404).json({ error: "Project not found." });
  res.json({ ok: true });
});

// ---------- Skills ----------

app.get("/api/skills", (req, res) => {
  const rows = db.prepare("SELECT * FROM skills ORDER BY category, id").all();
  res.json(rows);
});

app.post("/api/skills", requireAuth, (req, res) => {
  const { name, category = "General" } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Skill name is required." });
  }
  const result = db
    .prepare("INSERT INTO skills (name, category) VALUES (?, ?)")
    .run(name.trim(), category.trim() || "General");
  const created = db.prepare("SELECT * FROM skills WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(created);
});

app.put("/api/skills/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare("SELECT * FROM skills WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "Skill not found." });

  const { name = existing.name, category = existing.category } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Skill name is required." });
  }

  db.prepare("UPDATE skills SET name = ?, category = ? WHERE id = ?").run(
    name.trim(),
    category.trim() || "General",
    id
  );

  const updated = db.prepare("SELECT * FROM skills WHERE id = ?").get(id);
  res.json(updated);
});

app.delete("/api/skills/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  const result = db.prepare("DELETE FROM skills WHERE id = ?").run(id);
  if (result.changes === 0) return res.status(404).json({ error: "Skill not found." });
  res.json({ ok: true });
});

// ---------- Contact messages ----------

app.post("/api/contact", (req, res) => {
  const { name, email, message } = req.body || {};
  if (!name || !name.trim() || !email || !email.trim() || !message || !message.trim()) {
    return res.status(400).json({ error: "Name, email, and message are all required." });
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email.trim())) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }
  db.prepare("INSERT INTO messages (name, email, message) VALUES (?, ?, ?)").run(
    name.trim(),
    email.trim(),
    message.trim()
  );
  res.status(201).json({ ok: true });
});

app.get("/api/messages", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM messages ORDER BY id DESC").all();
  res.json(rows);
});

app.delete("/api/messages/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  const result = db.prepare("DELETE FROM messages WHERE id = ?").run(id);
  if (result.changes === 0) return res.status(404).json({ error: "Message not found." });
  res.json({ ok: true });
});

// ---------- Fallback 404 for unknown API routes ----------
app.use("/api", (req, res) => res.status(404).json({ error: "Not found." }));

app.listen(PORT, () => {
  console.log(`Portfolio server running at http://localhost:${PORT}`);
});
