const express = require('express');
const cors = require('cors');
require('dotenv').config();

const eventsRoutes = require('./routes/events');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/events', eventsRoutes);
app.get("/", (req, res) => {
  res.send("Backend is running successfully 🚀");
});
app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});