/**
 * Service for fetching and processing S&P 500 stock data
 * Features: Batching Alpha Vantage queries, calculating metrics, disposition, API data shape to dashboard shape.
 */

/**
 * Loads Finnhub API key from environment variable if available.
 * - Allows .env (REACT_APP_FINNHUB_API_KEY) configuration for development/production.
 */
const FINNHUB_API_KEY =
  process.env.REACT_APP_FINNHUB_API_KEY || "YOUR_REAL_FINNHUB_API_KEY";

/**
 * Finnhub API base endpoint
 */
const FINNHUB_BASE = "https://finnhub.io/api/v1";

/**
 * Utility: Fetch quotes for a set of tickers from Finnhub (up to 100 in ~1s for free tier).
 * Returns: { stocks: [{ symbol, price, volume, lastUpdate, metrics: [...] }], meta: { timestamp } }
 * Throws error with .code property: "401", "429", "network", etc.
 */
/**
 * PUBLIC_INTERFACE
 * Batch fetch stock quotes from Finnhub. No "metrics" API for 10 metrics in free tier--values returned as null for now.
 */
export async function fetchFinnhubBatch(tickers) {
  // Finnhub free tier only supports per-ticker quote in real time, but allows burst, so parallelize up to 60/minute.
  let stocks = [];
  let meta = {};
  let allFetches = [];
  let firstError = null;
  for (const symbol of tickers) {
    // Symbol is the actual ticker, e.g. "AAPL"
    const url = `${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(FINNHUB_API_KEY)}`;
    allFetches.push(
      fetch(url)
        .then(async res => {
          if (!res.ok) {
            let code = String(res.status);
            let errMsg = `Finnhub API error (HTTP ${res.status})`;
            if (res.status === 401 || res.status === 403) {
              code = "401";
              errMsg = "Unauthorized: Finnhub API key is missing or invalid.";
            } else if (res.status === 429) {
              code = "429";
              errMsg = "Finnhub API rate limit exceeded.";
            }
            let text = "";
            try { text = await res.text(); } catch {}
            const e = new Error(`${errMsg}${text ? ` [${text}]` : ""}`);
            e.code = code;
            throw e;
          }
          let obj;
          try {
            obj = await res.json();
          } catch {
            const e = new Error("Finnhub API response is not valid JSON.");
            e.code = "invalid-json";
            throw e;
          }
          // If quote with no price, treat as error (Finnhub sometimes emits empty result)
          if (!obj.c) {
            const e = new Error(`Finnhub: No quote found for ${symbol}`);
            e.code = "notfound";
            throw e;
          }
          // c: current price, t: timestamp, v: volume, o: open, h: high, l: low, pc: previous close
          return {
            symbol: symbol,
            price: typeof obj.c === "number" ? obj.c : null,
            volume: typeof obj.v === "number" ? obj.v : null,
            lastUpdate: obj.t ? new Date(obj.t * 1000).toLocaleString() : null
          };
        })
        .catch(err => {
          if (!firstError) firstError = err;
          // Return stub stock with only symbol & error for mapping
          return {
            symbol,
            error: err.message,
            price: null,
            volume: null,
            lastUpdate: null
          };
        })
    );
  }
  const out = await Promise.all(allFetches);
  stocks = out.map(item => ({
    ...item,
    metrics: genStockMetrics(item)
  }));
  // Find the latest timestamp returned as representative "API last update"
  const validUpdates = stocks.filter(s => s.lastUpdate).map(s => new Date(s.lastUpdate));
  meta.timestamp =
    validUpdates.length > 0
      ? new Date(Math.max(...validUpdates.map(d => d.getTime()))).toLocaleString()
      : new Date().toLocaleString();
  // If all stock fetches failed, throw the first error.
  if (firstError && stocks.every(s => s.price == null)) {
    if (!firstError.code) firstError.code = "unknown";
    throw firstError;
  }
  return { stocks, meta };
}

/**
 * Returns placeholder metric fields for Finnhub quote response;
 * For a real application, these values could be fetched from Finnhub's paid fundamental endpoints.
 */
function genStockMetrics(stock) {
  // Finnhub free tier: only price, volume returned. Real metrics would require paid endpoints.
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
