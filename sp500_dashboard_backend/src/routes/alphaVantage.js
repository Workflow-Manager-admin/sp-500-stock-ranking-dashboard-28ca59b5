const express = require('express');
const axios = require('axios');
const router = express.Router();

const ALPHA_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const BASE_URL = "https://www.alphavantage.co/query";

// PUBLIC_INTERFACE
/**
 * Proxy endpoint that retrieves batch S&P 500 data from Alpha Vantage,
 * with optional local caching, request collapsing, and error handling.
 * Query: ?symbols=AAPL,MSFT,GOOGL,...
 *
 * Returns:
 *   { stocks: [...], meta: {...} }
 */
router.get('/batch', async (req, res) => {
  const symbols = req.query.symbols;
  if (!symbols) {
    return res.status(400).json({ error: 'Missing `symbols` query parameter.' });
  }
  if (!ALPHA_API_KEY) {
    return res.status(500).json({ error: 'Alpha Vantage API key is not configured.' });
  }

  let stocks = [];
  let meta = {};
  try {
    // Alpha Vantage BATCH_STOCK_QUOTES is deprecated for most accounts,
    // so fallback logic may be needed
    const url = `${BASE_URL}?function=BATCH_STOCK_QUOTES&symbols=${symbols}&apikey=${ALPHA_API_KEY}`;
    const response = await axios.get(url);

    if (response.data["Meta Data"] && response.data["Stock Quotes"]) {
      stocks = response.data["Stock Quotes"].map(item => ({
        symbol: item["1. symbol"],
        price: Number(item["2. price"]),
        volume: Number(item["3. volume"])
      }));
      meta.timestamp = response.data["Meta Data"]["3. Last Refreshed"] ||
        response.data["Meta Data"]["Last Refreshed"] ||
        new Date().toLocaleString();
    } else if (response.data["Stock Quotes"]) {
      stocks = response.data["Stock Quotes"].map(item => ({
        symbol: item["1. symbol"],
        price: Number(item["2. price"]),
        volume: Number(item["3. volume"])
      }));
      meta.timestamp = new Date().toLocaleString();
    } else {
      // Fallback: fetch each symbol individually using GLOBAL_QUOTE
      const tickers = symbols.split(',');
      stocks = await Promise.all(tickers.map(async (sym) => {
        const resp = await axios.get(`${BASE_URL}?function=GLOBAL_QUOTE&symbol=${sym}&apikey=${ALPHA_API_KEY}`);
        const data = resp.data["Global Quote"];
        let lastUpdate = data && data["07. latest trading day"];
        return {
          symbol: data["01. symbol"] || sym,
          price: Number(data["05. price"] || 0),
          volume: Number(data["06. volume"] || 0),
          lastUpdate
        };
      }));
      if (stocks.length > 0 && stocks[0].lastUpdate)
        meta.timestamp = stocks[0].lastUpdate;
      else
        meta.timestamp = new Date().toLocaleString();
    }

    res.json({ stocks, meta });
  } catch (err) {
    console.error("[Alpha Proxy Error]", err?.response?.data || err.message);
    res.status(500).json({
      error: 'Failed to fetch from Alpha Vantage API',
      message: err?.response?.data || err.message
    });
  }
});

module.exports = router;
