// server.js

const express    = require("express");
const bodyParser = require("body-parser");
const path       = require("path");
const { createClient } = require("@supabase/supabase-js");

const app  = express();
const PORT = process.env.PORT || 3000;

// 1. SUPABASE SETUP
const supabase = createClient(
  "https://txggdpttymcrtmuioagf.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Z2dkcHR0eW1jcnRtdWlvYWdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0ODc4NjYsImV4cCI6MjA2MzA2Mzg2Nn0.Ord32WnKOADFxIIMPXu7_rkm6ZwcDDmgIvr0bL4TSN0"
);

// 2. MIDDLEWARE
app.use(bodyParser.json());
app.use(express.static(__dirname));  // serve your .html/.css/.js/images

// 3. STATIC SITE ROUTES
app.get("/",           (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/join",       (req, res) => res.sendFile(path.join(__dirname, "join.html")));
app.get("/membership", (req, res) => res.sendFile(path.join(__dirname, "membership.html")));
app.get("/documents",  (req, res) => res.sendFile(path.join(__dirname, "document.html")));
app.get("/meetings",   (req, res) => res.sendFile(path.join(__dirname, "meetings.html")));
app.get("/team",       (req, res) => res.sendFile(path.join(__dirname, "team.html")));
app.get("/functions",  (req, res) => res.sendFile(path.join(__dirname, "functions.html")));
app.get("/admin",      (req, res) => res.sendFile(path.join(__dirname, "admin.html")));

// 4. JOIN REQUESTS API

// Create a join request
app.post("/join", async (req, res) => {
  const { name, email, phone } = req.body;
  const { data, error } = await supabase
    .from("join_requests")
    .insert([{ name, email, phone }]);

  if (error) {
    console.error("Supabase insert error:", error);
    return res.status(500).json({ error: "Failed to save join request." });
  }
  res.status(200).json({ message: "Join request saved.", id: data[0].id });
});

// Get all join requests
app.get("/api/join_requests", async (req, res) => {
  const { data, error } = await supabase
    .from("join_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase fetch error:", error);
    return res.status(500).json({ error: "Failed to fetch join requests." });
  }
  res.json(data);
});

// Get one join request
app.get("/api/join/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("join_requests")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "Join request not found." });
  }
  res.json(data);
});

// Update a join request
app.put("/api/join/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("join_requests")
    .update(req.body)
    .eq("id", req.params.id);

  if (error) {
    console.error("Supabase update error:", error);
    return res.status(500).json({ error: "Failed to update join request." });
  }
  res.json({ message: "Join request updated.", data });
});

// Delete a join request
app.delete("/api/join/:id", async (req, res) => {
  const { error } = await supabase
    .from("join_requests")
    .delete()
    .eq("id", req.params.id);

  if (error) {
    console.error("Supabase delete error:", error);
    return res.status(500).json({ error: "Failed to delete join request." });
  }
  res.json({ message: "Join request deleted." });
});

// 5. MEMBERSHIP API

// Submit membership form
app.post("/membership", async (req, res) => {
  // Check if form is accepting responses
  const { data: setting, error: settingErr } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "accept_membership")
    .single();

  if (settingErr || setting.value !== "yes") {
    return res.status(403).json({ error: "Form is not currently accepting responses." });
  }

  // Insert membership
  const { data, error } = await supabase
    .from("membership")
    .insert([req.body]);

  if (error) {
    console.error("Supabase membership insert error:", error);
    return res.status(500).json({ error: "Failed to save membership." });
  }
  res.status(200).json({ message: "Membership saved.", id: data[0].id });
});

// Get all members
app.get("/api/members", async (req, res) => {
  const { data, error } = await supabase.from("membership").select("*");
  if (error) {
    console.error("Supabase fetch members error:", error);
    return res.status(500).json({ error: "Failed to fetch members." });
  }
  res.json(data);
});

// Get one member
app.get("/api/members/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("membership")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "Member not found." });
  }
  res.json(data);
});

// Update a member
app.put("/api/members/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("membership")
    .update(req.body)
    .eq("id", req.params.id);

  if (error) {
    console.error("Supabase update member error:", error);
    return res.status(500).json({ error: "Failed to update member." });
  }
  res.json({ message: "Member updated.", data });
});

// Delete a member
app.delete("/api/members/:id", async (req, res) => {
  const { error } = await supabase
    .from("membership")
    .delete()
    .eq("id", req.params.id);

  if (error) {
    console.error("Supabase delete member error:", error);
    return res.status(500).json({ error: "Failed to delete member." });
  }
  res.json({ message: "Member deleted." });
});

// 6. SETTINGS API

// Get a setting
app.get("/api/settings/:key", async (req, res) => {
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", req.params.key)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "Setting not found." });
  }
  res.json({ value: data.value });
});

// Update a setting
app.put("/api/settings/:key", async (req, res) => {
  const { error } = await supabase
    .from("settings")
    .update({ value: req.body.value })
    .eq("key", req.params.key);

  if (error) {
    console.error("Supabase update setting error:", error);
    return res.status(500).json({ error: "Failed to update setting." });
  }
  res.json({ message: "Setting updated." });
});

// 7. START SERVER
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
