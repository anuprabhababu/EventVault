const express = require('express');
const cors = require('cors');
require('dotenv').config();

const eventsRoutes = require('./routes/events');

const app = express();

/* ================= CORS CONFIG ================= */

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://ex1-liard-six.vercel.app",
    "https://ex1-hs3zfawan-anuprabhas-projects.vercel.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type"]
}));

/* ================= MIDDLEWARE ================= */

app.use(express.json());

/* ================= ROUTES ================= */

app.use('/api/events', eventsRoutes);

/* ================= TEST ROUTE ================= */

app.get("/", (req, res) => {
  res.send("NEW VERSION - CORS TEST");
});

/* ================= SERVER ================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});