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
// Create tables if they don't exist
db.serialize(() => {
  // Membership form control
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  db.run(`
    INSERT OR IGNORE INTO settings (key, value) VALUES ('accept_membership', 'yes')
  `);

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
      promo_code TEXT,
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

// Get all join requests with formatted date
app.get("/api/join_requests", (req, res) => {
  db.all("SELECT *, datetime(id, 'unixepoch') AS date_submitted FROM join_requests", [], (err, rows) => {
    if (err) {
      console.error("Error fetching join requests:", err);
      return res.status(500).json({ error: "Failed to fetch join requests." });
    }
    res.json(rows);
  });
});

// GET single join request by ID (used by frontend: /api/join/:id)
app.get("/api/join/:id", (req, res) => {
  const id = req.params.id;
  db.get("SELECT * FROM join_requests WHERE id = ?", [id], (err, row) => {
    if (err) {
      console.error("Error fetching join request:", err);
      return res.status(500).json({ error: "Failed to fetch join request." });
    }
    if (!row) {
      return res.status(404).json({ error: "Join request not found." });
    }
    res.json(row);
  });
});

// UPDATE join request by ID (frontend expects PUT /api/join/:id)
app.put("/api/join/:id", (req, res) => {
  const id = req.params.id;
  const fields = req.body;
  const cols = Object.keys(fields);

  if (!cols.length) {
    return res.status(400).json({ error: "No fields to update." });
  }

  const assignments = cols.map(c => `\`${c}\` = ?`).join(", ");
  const values = cols.map(c => fields[c]);

  db.run(
    `UPDATE join_requests SET ${assignments} WHERE id = ?`,
    [...values, id],
    function (err) {
      if (err) {
        console.error("Error updating join request:", err);
        return res.status(500).json({ error: "Failed to update join request." });
      }
      res.json({ message: "Join request updated.", changes: this.changes });
    }
  );
});

// DELETE join request by ID (frontend expects DELETE /api/join/:id)
app.delete("/api/join/:id", (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM join_requests WHERE id = ?", [id], function (err) {
    if (err) {
      console.error("Error deleting join request:", err);
      return res.status(500).json({ error: "Failed to delete join request." });
    }
    res.json({ message: "Join request deleted.", changes: this.changes });
  });
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
  db.get(`SELECT value FROM settings WHERE key = 'accept_membership'`, (err, row) => {
    if (err) {
      console.error("Setting check failed:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
    if (!row || row.value !== 'yes') {
      return res.status(403).json({ error: "Form is not currently accepting responses." });
    }

    // Destructure request data
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

// GET single member by ID
app.get("/api/members/:id", (req, res) => {
  const id = req.params.id;
  db.get("SELECT * FROM membership WHERE id = ?", [id], (err, row) => {
    if (err) {
      console.error("Error fetching membership:", err);
      return res.status(500).json({ error: "Failed to fetch membership." });
    }
    if (!row) {
      return res.status(404).json({ error: "Membership not found." });
    }
    res.json(row);
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
// Get setting by key
app.get("/api/settings/:key", (req, res) => {
  const key = req.params.key;
  db.get("SELECT value FROM settings WHERE key = ?", [key], (err, row) => {
    if (err) return res.status(500).json({ error: "DB error" });
    if (!row) return res.status(404).json({ error: "Setting not found" });
    res.json({ value: row.value });
  });
});

// Update setting by key
app.put("/api/settings/:key", (req, res) => {
  const key = req.params.key;
  const value = req.body.value;
  db.run(
    "UPDATE settings SET value = ? WHERE key = ?",
    [value, key],
    function(err) {
      if (err) return res.status(500).json({ error: "Update failed" });
      res.json({ message: "Setting updated", changes: this.changes });
    }
  );
});

// 4. START SERVER
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
