const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

// Use bodyParser to parse JSON from requests
app.use(bodyParser.json());

// Serve static files (HTML, CSS, JS, images) from the same directory
app.use(express.static(__dirname));

/**
 * Helper function to append data to a CSV file,
 * creating the file with headers if it doesn't exist.
 *
 * @param {string} csvFileName  - The CSV filename (e.g. "membership.csv")
 * @param {string[]} headers    - Ordered array of column headers
 * @param {object} formData     - The data object from the request body
 */
function appendToCSV(csvFileName, headers, formData) {
  const csvPath = path.join(__dirname, csvFileName);

  // Build row in the same order as headers
  const rowData = headers.map((header) => {
    // If the field doesn't exist in formData, use an empty string
    return formData[header] || "";
  });
  // Convert array to CSV string (comma-separated, each row in a new line)
  const rowString = rowData.join(",") + "\n";

  // If file doesn't exist, create it with headers
  if (!fs.existsSync(csvPath)) {
    const headerString = headers.join(",") + "\n";
    fs.writeFileSync(csvPath, headerString, { encoding: "utf-8" });
  }

  // Append the new row
  fs.appendFileSync(csvPath, rowString, { encoding: "utf-8" });
}

/**
 * 1. Handle membership form submissions
 */
app.post("/membership", (req, res) => {
  // The body should be JSON with fields from your membership form
  const {
    email,
    country,
    first_name,
    middle_name,
    last_name,
    military_veteran,
    birth_month,
    birth_day,
    birth_year,
    company,
    address_type,
    address1,
    address2,
    city,
    state,
    zip,
    phone,
    title,
    firm,
    function: func, // 'function' is a reserved word in JS, so rename it
    interest,
    promo_code,
  } = req.body;

  // Decide on your column headers (order is important)
  const headers = [
    "email",
    "country",
    "first_name",
    "middle_name",
    "last_name",
    "military_veteran",
    "birth_month",
    "birth_day",
    "birth_year",
    "company",
    "address_type",
    "address1",
    "address2",
    "city",
    "state",
    "zip",
    "phone",
    "title",
    "firm",
    "function",
    "interest",
    "promo_code",
  ];

  // Prepare an object keyed exactly by the headers
  const formData = {
    email,
    country,
    first_name,
    middle_name,
    last_name,
    military_veteran,
    birth_month,
    birth_day,
    birth_year,
    company,
    address_type,
    address1,
    address2,
    city,
    state,
    zip,
    phone,
    title,
    firm,
    function: func,
    interest,
    promo_code,
  };

  try {
    appendToCSV("membership.csv", headers, formData);
    // Respond with a success message (the front-end can choose to ignore or show it)
    res.status(200).json({ message: "Membership data saved successfully." });
  } catch (error) {
    console.error("Error writing membership data:", error);
    res.status(500).json({ error: "Failed to write membership data." });
  }
});

/**
 * 2. Handle join form submissions
 */
app.post("/join", (req, res) => {
  const { name, email, phone } = req.body;

  // Decide on your column headers (order is important)
  const headers = ["name", "email", "phone"];

  // Create an object keyed exactly by the headers
  const formData = { name, email, phone };

  try {
    appendToCSV("join.csv", headers, formData);
    res.status(200).json({ message: "Join data saved successfully." });
  } catch (error) {
    console.error("Error writing join data:", error);
    res.status(500).json({ error: "Failed to write join data." });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
