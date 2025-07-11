/**
 * Service for fetching and processing S&P 500 stock data
 * Features: Batching Alpha Vantage queries, calculating metrics, disposition, API data shape to dashboard shape.
 */

const ALPHA_VANTAGE_API_KEY = "N2ND0W9CPE0GMUWB"; // Updated to new Alpha Vantage API key for live fetch test.
const ALPHA_VANTAGE_BASE = "https://www.alphavantage.co/query";

/**
 * Utility: Fetch stock quote batch (up to 100) from Alpha Vantage API ONLY.
 * Returns: { stocks: [{ symbol, metrics: [...], ... }], meta: { timestamp } }
 * If the API call fails, this throws an error (no mock data is ever returned).
 */
/**
 * PUBLIC_INTERFACE
 * Enhanced batch fetch for Alpha Vantage with rich error info.
 * Throws Error with .code prop: "401", "429", "endpoint", "network", etc, and a friendly detail message.
 */
export async function fetchAlphaVantageBatch(tickers) {
  const symbols = tickers.join(",");
  let stocks = [];
  let meta = {};
  try {
    const url = `${ALPHA_VANTAGE_BASE}?function=BATCH_STOCK_QUOTES&symbols=${symbols}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    let res;
    try {
      res = await fetch(url);
    } catch (networkErr) {
      const e = new Error("Network error: Unable to reach Alpha Vantage (offline or CORS/network issue). Try again later.");
      e.code = "network";
      throw e;
    }
    // Non-2xx status? Check details
    if (!res.ok) {
      let code;
      let errMsg = "";
      if (res.status === 401) {
        code = "401";
        errMsg = "Unauthorized: The Alpha Vantage API key is missing or invalid.";
      } else if (res.status === 429) {
        code = "429";
        errMsg = "Rate limit exceeded: Too many requests sent to Alpha Vantage. Please wait a minute before retrying.";
      } else if (res.status === 404) {
        code = "endpoint";
        errMsg = "API endpoint not found (Alpha Vantage endpoint might be incorrect or deprecated).";
      } else {
        code = String(res.status);
        errMsg = `Alpha Vantage API error (HTTP ${res.status})`;
      }
      let bodyText = "";
      try {
        bodyText = await res.text();
      } catch {}
      const e = new Error(`${errMsg}${bodyText ? ` [${bodyText}]` : ""}`);
      e.code = code;
      throw e;
    }

    // Try parsing JSON for further API-specific diagnostics
    let obj;
    try {
      obj = await res.json();
    } catch (jsonErr) {
      const e = new Error("Alpha Vantage API response is not valid JSON. Try again later.");
      e.code = "invalid-json";
      throw e;
    }

    // Diagnose error messages (Alpha Vantage "Note" or "Error Message" fields)
    if (obj["Note"]) {
      const msg = obj["Note"];
      // Note usually means rate limiting (5/min) or unallowed endpoint on free key
      const e = new Error(`Alpha Vantage: ${msg}`);
      e.code = msg.toLowerCase().includes("frequency") || msg.toLowerCase().includes("limit") ? "429" : "other";
      throw e;
    }
    if (obj["Error Message"]) {
      const msg = obj["Error Message"];
      // Usually means bad endpoint, bad key, or request params
      const e = new Error(`Alpha Vantage: ${msg}`);
      if (/apikey|api key|invalid key|authorization|unauthorized/i.test(msg)) e.code = "401";
      else if (/endpoint|not available|invalid/i.test(msg)) e.code = "endpoint";
      else e.code = "other";
      throw e;
    }

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
      // (Could also produce rate limits more easily)
      stocks = await Promise.all(
        tickers.map(async sym => {
          try {
            const singleUrl = `${ALPHA_VANTAGE_BASE}?function=GLOBAL_QUOTE&symbol=${sym}&apikey=${ALPHA_VANTAGE_API_KEY}`;
            let r;
            try {
              r = await fetch(singleUrl);
            } catch (singleNetworkErr) {
              const e = new Error("Network error on single ticker fetch");
              e.code = "network";
              throw e;
            }
            if (!r.ok) {
              let code;
              let errMsg = "";
              if (r.status === 401) {
                code = "401";
                errMsg = "Unauthorized: Invalid API key (single quote).";
              } else if (r.status === 429) {
                code = "429";
                errMsg = "Rate limit exceeded (single quote).";
              } else {
                code = String(r.status);
                errMsg = `API error (HTTP ${r.status}) for symbol: ${sym}`;
              }
              let bodyText = "";
              try {
                bodyText = await r.text();
              } catch {}
              const e = new Error(`${errMsg}${bodyText ? ` [${bodyText}]` : ""}`);
              e.code = code;
              throw e;
            }
            const o = await r.json();
            if (o["Note"]) {
              const e = new Error(`Alpha Vantage: ${o["Note"]}`);
              e.code = o["Note"].toLowerCase().includes("frequency") || o["Note"].toLowerCase().includes("limit") ? "429" : "other";
              throw e;
            }
            if (o["Error Message"]) {
              const e = new Error(`Alpha Vantage: ${o["Error Message"]}`);
              if (/apikey|api key|invalid key|authorization|unauthorized/i.test(o["Error Message"])) e.code = "401";
              else if (/endpoint|not available|invalid/i.test(o["Error Message"])) e.code = "endpoint";
              else e.code = "other";
              throw e;
            }
            return mapAlphaToStockSingle(o, sym);
          } catch (tickerErr) {
            throw tickerErr;
          }
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
    // Attach any error code for the UI, default to generic if not set
    if (!err.code) err.code = "unknown";
    throw err;
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
