const express = require('express');
const cors = require('cors');
require('dotenv').config();

const eventsRoutes = require('./routes/events');

const app = express();

/* ================= CORS ================= */

app.use(cors());
app.use(express.json());

/* Explicitly handle preflight */
app.options('*', cors());

/* ================= ROUTES ================= */

app.use('/api/events', eventsRoutes);

/* ================= TEST ROUTE ================= */

app.get("/", (req, res) => {
  res.send("NEW VERSION - CORS TEST ✅");
});

/* ================= SERVER ================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});