require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const alphaRoutes = require('./routes/alphaVantage');

const PORT = process.env.PORT || 4000;

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
// PUBLIC_INTERFACE
app.get('/api/health', (req, res) => {
  /** Simple health check endpoint */
  res.json({ status: "ok", service: "sp500_dashboard_backend" });
});

// Alpha Vantage API aggregation/proxy
app.use('/api/alpha', alphaRoutes);

app.listen(PORT, () => {
  console.log(`sp500_dashboard_backend listening on port ${PORT}`);
});
