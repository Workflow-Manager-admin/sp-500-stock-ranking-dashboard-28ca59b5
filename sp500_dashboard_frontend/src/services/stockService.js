/**
 * Service for fetching and processing S&P 500 stock data
 * Features: Batching Alpha Vantage queries, calculating metrics, disposition, API data shape to dashboard shape.
 */

const ALPHA_VANTAGE_API_KEY = "9LKVL09B54FBSV0Y"; // Set to provided Alpha Vantage API key for live fetch test.
const ALPHA_VANTAGE_BASE = "https://www.alphavantage.co/query";

/**
 * Utility: Fetch stock quote batch (up to 100) from Alpha Vantage API ONLY.
 * Returns: { stocks: [{ symbol, metrics: [...], ... }], meta: { timestamp } }
 * If the API call fails, this throws an error (no mock data is ever returned).
 */
// PUBLIC_INTERFACE
export async function fetchAlphaVantageBatch(tickers) {
  const symbols = tickers.join(",");
  let stocks = [];
  let meta = {};
  // First attempt: try BATCH_STOCK_QUOTES
  try {
    const url = `${ALPHA_VANTAGE_BASE}?function=BATCH_STOCK_QUOTES&symbols=${symbols}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("API error");
    const obj = await res.json();

    if (obj["Meta Data"] && obj["Stock Quotes"]) {
      stocks = obj["Stock Quotes"].map(mapAlphaToStock);
      meta.timestamp =
        obj["Meta Data"]["3. Last Refreshed"] ||
        obj["Meta Data"]["Last Refreshed"] ||
        new Date().toLocaleString();
    } else if (obj["Stock Quotes"]) {
      // If "Meta Data" missing, fallback to current time (shouldn't occur normally)
      stocks = obj["Stock Quotes"].map(mapAlphaToStock);
      meta.timestamp = new Date().toLocaleString();
    } else {
      // Second fallback: fetch each ticker individually with GLOBAL_QUOTE endpoint
      stocks = await Promise.all(
        tickers.map(async sym => {
          const singleUrl = `${ALPHA_VANTAGE_BASE}?function=GLOBAL_QUOTE&symbol=${sym}&apikey=${ALPHA_VANTAGE_API_KEY}`;
          const r = await fetch(singleUrl);
          if (!r.ok) throw new Error("API error for symbol: " + sym);
          const o = await r.json();
          return mapAlphaToStockSingle(o, sym);
        })
      );
      // Extract the most recent available timestamp from the first quote (if present)
      if (
        Array.isArray(stocks) &&
        stocks.length > 0 &&
        stocks[0].lastUpdate
      ) {
        meta.timestamp = stocks[0].lastUpdate;
      } else {
        meta.timestamp = new Date().toLocaleString();
      }
    }
    // Compute metrics and return
    stocks = stocks.map(s => ({
      ...s,
      metrics: genStockMetrics(s),
    }));
    return { stocks, meta };
  } catch (err) {
    // No mock or fallback: propagate error so dashboard shows error state (never returns stocks)
    throw new Error("Failed to fetch live data from Alpha Vantage API.");
  }
}

// PUBLIC_INTERFACE
function mapAlphaToStock(item) {
  return {
    symbol: item["1. symbol"],
    price: Number(item["2. price"]),
    volume: Number(item["3. volume"]),
    // Alpha Vantage batch does not provide a per-stock date
  };
}

// PUBLIC_INTERFACE
function mapAlphaToStockSingle(obj, sym) {
  // Alpha Vantage single quote in obj["Global Quote"]
  const d = obj["Global Quote"];
  let lastUpdate;
  // Try to extract latest timestamp from "07. latest trading day"
  // If present, Alpha Vantage "07. latest trading day" is "YYYY-MM-DD"
  if (d && d["07. latest trading day"]) {
    lastUpdate = d["07. latest trading day"];
  }
  return {
    symbol: d["01. symbol"] || sym,
    price: Number(d["05. price"] || 0),
    volume: Number(d["06. volume"] || 0),
    lastUpdate,
  };
}

// PUBLIC_INTERFACE
function genStockMetrics(stock) {
  // If you wish to expand this to fetch real metrics, do so here.
  // Currently, this is a placeholder and should be replaced with real metric fetching in future.
  // Here we produce empty or default metrics (since we avoid mock/random data).
  // At minimum, you may want to set metrics to [] or N/A fields as appropriate.
  // For now, let's leave all as N/A to avoid using random/mocked metrics.
  return [
    { name: "P/E Ratio", short: "PE", value: null },
    { name: "EPS", short: "EPS", value: null },
    { name: "Return on Equity", short: "ROE", value: null },
    { name: "Debt/Equity", short: "D/E", value: null },
    { name: "Profit Margin (%)", short: "PM", value: null },
    { name: "Price/Sales", short: "P/S", value: null },
    { name: "Current Ratio", short: "CR", value: null },
    { name: "Quick Ratio", short: "QR", value: null },
    { name: "Dividend Yield (%)", short: "DivY", value: null },
    { name: "Beta", short: "Beta", value: null },
  ];
}

/**
 * List of the first 100 S&P500 tickers,
 * Used for dashboard display and service functions.
 */
export const SP500_TICKERS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "BRK.B", "LLY", "TSLA", "JPM",
  "V", "UNH", "JNJ", "XOM", "PG", "MA", "AVGO", "HD", "COST", "MRK",
  "ABBV", "NFLX", "ADBE", "PEP", "CRM", "CVX", "WMT", "AMD", "MCD", "KO",
  "TMO", "LIN", "DIS", "VZ", "INTC", "BMY", "QCOM", "TXN", "CSCO", "ABT",
  "AMGN", "DUK", "DHR", "SBUX", "HON", "CAT", "GS", "MDT", "ISRG", "UNP",
  "EMR", "MMM", "BA", "GE", "NOW", "LMT", "BLK", "GILD", "ZTS", "LOW",
  "BKNG", "TJX", "TGT", "AXP", "FISV", "ADI", "DE", "SYK", "REGN", "NOC",
  "MO", "PFE", "CI", "MDLZ", "SO", "SPGI", "USB", "C", "ADP", "EOG",
  "HUM", "AON", "VRTX", "MS", "SCHW", "SHW", "ELV", "PLD", "CB", "AIG",
  "CL", "FDX", "COF", "APD", "ITW", "PSX", "PGR", "WM", "CME", "BSX"
];

// Official S&P 500 list fetch (if needed)
// PUBLIC_INTERFACE
export async function fetchSP500Stocks() {
  // For production, get from a backend or official source.
  return SP500_TICKERS;
}
