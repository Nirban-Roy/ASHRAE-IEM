// server.js

const express    = require("express");
const bodyParser = require("body-parser");
const path       = require("path");
const sqlite3    = require("sqlite3").verbose();

const app  = express();
const PORT = process.env.PORT || 3000;

// 1. MIDDLEWARE
app.use(bodyParser.json());
app.use(express.static(__dirname));  // serve all your .html/.css/.js/images

// 2. SQLITE SETUP
const db = new sqlite3.Database(path.join(__dirname, "app.db"), err => {
  if (err) {
    console.error("Failed to open database:", err);
    process.exit(1);
  }
});

// Create tables if they don't exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS membership (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      email             TEXT,
      country           TEXT,
      first_name        TEXT,
      middle_name       TEXT,
      last_name         TEXT,
      military_veteran  TEXT,
      birth_month       INTEGER,
      birth_day         INTEGER,
      birth_year        INTEGER,
      company           TEXT,
      address_type      TEXT,
      address1          TEXT,
      address2          TEXT,
      city              TEXT,
      state             TEXT,
      zip               TEXT,
      phone             TEXT,
      title             TEXT,
      firm              TEXT,
      \`function\`       TEXT,
      interest          TEXT,
      promo_code        TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS join_requests (
      id     INTEGER PRIMARY KEY AUTOINCREMENT,
      name   TEXT,
      email  TEXT,
      phone  TEXT
    )
  `);
});

// 3. ROUTES

// 3a. Static site routes
app.get("/",           (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/join",       (req, res) => res.sendFile(path.join(__dirname, "join.html")));
app.get("/membership", (req, res) => res.sendFile(path.join(__dirname, "membership.html")));
app.get("/documents",  (req, res) => res.sendFile(path.join(__dirname, "document.html")));
app.get("/meetings",   (req, res) => res.sendFile(path.join(__dirname, "meetings.html")));
app.get("/team",       (req, res) => res.sendFile(path.join(__dirname, "team.html")));
app.get("/functions",  (req, res) => res.sendFile(path.join(__dirname, "functions.html")));

// 3b. Admin UI
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

// 3c. Join form → INSERT into join_requests
app.post("/join", (req, res) => {
  const { name, email, phone } = req.body;
  const stmt = db.prepare(`
    INSERT INTO join_requests (name, email, phone)
    VALUES (?, ?, ?)
  `);
  stmt.run(name, email, phone, function(err) {
    if (err) {
      console.error("Error saving join request:", err);
      return res.status(500).json({ error: "Failed to save join request." });
    }
    res.status(200).json({ message: "Join request saved.", id: this.lastID });
  });
  stmt.finalize();
});

// 3d. Membership form → INSERT into membership
app.post("/membership", (req, res) => {
  const {
    email, country, first_name, middle_name, last_name,
    military_veteran, birth_month, birth_day, birth_year,
    company, address_type, address1, address2, city,
    state, zip, phone, title, firm, function: func,
    interest, promo_code
  } = req.body;

  const stmt = db.prepare(`
    INSERT INTO membership (
      email, country, first_name, middle_name, last_name,
      military_veteran, birth_month, birth_day, birth_year,
      company, address_type, address1, address2, city,
      state, zip, phone, title, firm, \`function\`,
      interest, promo_code
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    email, country, first_name, middle_name, last_name,
    military_veteran, birth_month, birth_day, birth_year,
    company, address_type, address1, address2, city,
    state, zip, phone, title, firm, func,
    interest, promo_code,
    function(err) {
      if (err) {
        console.error("Error saving membership:", err);
        return res.status(500).json({ error: "Failed to save membership." });
      }
      res.status(200).json({ message: "Membership saved.", id: this.lastID });
    }
  );
  stmt.finalize();
});

// 3e. Membership JSON API for Admin

// GET all members
app.get("/api/members", (req, res) => {
  db.all("SELECT * FROM membership", [], (err, rows) => {
    if (err) {
      console.error("Error fetching members:", err);
      return res.status(500).json({ error: "Failed to fetch members." });
    }
    res.json(rows);
  });
});

// UPDATE a member
app.put("/api/members/:id", (req, res) => {
  const id     = req.params.id;
  const fields = req.body;               // e.g. { first_name: "New", city: "Updated" }
  const cols   = Object.keys(fields);
  if (!cols.length) {
    return res.status(400).json({ error: "No fields to update." });
  }

  const assignments = cols.map(c => `\`${c}\` = ?`).join(", ");
  const values      = cols.map(c => fields[c]);

  db.run(
    `UPDATE membership SET ${assignments} WHERE id = ?`,
    [...values, id],
    function(err) {
      if (err) {
        console.error("Error updating member:", err);
        return res.status(500).json({ error: "Failed to update member." });
      }
      res.json({ message: "Member updated.", changes: this.changes });
    }
  );
});

// DELETE a member
app.delete("/api/members/:id", (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM membership WHERE id = ?", id, function(err) {
    if (err) {
      console.error("Error deleting member:", err);
      return res.status(500).json({ error: "Failed to delete member." });
    }
    res.json({ message: "Member deleted.", changes: this.changes });
  });
});

// 4. START SERVER
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
