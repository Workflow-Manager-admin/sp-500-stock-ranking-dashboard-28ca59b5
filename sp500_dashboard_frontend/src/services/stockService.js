 /**
  * Service for fetching and processing S&P 500 stock data.
  * Now fetches from finhub.io for Apple (AAPL) only.
  */

import axios from "axios";

const FINHUB_API_KEY = "d1ofvg9r01qjadrjstm0d1ofvg9r01qjadrjstmg";
const FINHUB_BASE = "https://finnhub.io/api/v1";

// PUBLIC_INTERFACE
/** Fetches quote data for AAPL from finhub.io */
export async function fetchFinhubAAPL() {
  const symbol = "AAPL";
  let stocks = [];
  let meta = {};
  try {
    const url = `${FINHUB_BASE}/quote?symbol=${symbol}&token=${FINHUB_API_KEY}`;
    let response;
    try {
      response = await axios.get(url, {
        timeout: 7000, // Optional: frontends may want to fail fast
        validateStatus: (status) => status >= 200 && status < 500
      });
    } catch (networkErr) {
      const e = new Error(
        "Network error: Unable to reach finhub.io (offline or CORS/network issue). Try again later."
      );
      e.code = "network";
      throw e;
    }

    // status !== 2xx (finnhub sends 200 for errors in JSON, so we need to check the body as well)
    if (!response || typeof response.status !== "number" || response.status < 200 || response.status >= 300) {
      let code = String(response?.status || "unknown");
      let errMsg = `finhub.io API error (HTTP ${response?.status})`;
      let bodyText = "";
      if (response?.data && typeof response.data === "string") {
        bodyText = response.data;
      }
      if (response?.data && typeof response.data === "object" && response.data.error) {
        bodyText = response.data.error;
      }
      const e = new Error(`${errMsg}${bodyText ? ` [${bodyText}]` : ""}`);
      e.code = code;
      throw e;
    }

    let obj = response.data;
    if ((obj === null) || (typeof obj !== "object")) {
      const e = new Error("Invalid finhub.io response object");
      e.code = "invalid-data";
      throw e;
    }

    // finhub.io /quote endpoint: c = current price, pc = previous close, t = timestamp, h = high, l = low, o = open, v = volume
    // Sample: {c: 273.81, d: -1.2, dp: -0.44, h: 275.21, l: 272.10, o: 274.5, pc: 275.01, t: 1718104836}
    const stock = {
      symbol: symbol,
      price: typeof obj.c === "number" ? obj.c : null,
      open: typeof obj.o === "number" ? obj.o : null,
      high: typeof obj.h === "number" ? obj.h : null,
      low: typeof obj.l === "number" ? obj.l : null,
      prevClose: typeof obj.pc === "number" ? obj.pc : null,
      volume: typeof obj.v === "number" ? obj.v : null,
      lastUpdate: obj.t ? new Date(obj.t * 1000).toLocaleString() : null,
      metrics: genStockMetricsFinhub(obj)
    };
    stocks.push(stock);
    meta.timestamp = stock.lastUpdate || new Date().toLocaleString();
    return { stocks, meta };
  } catch (err) {
    if (!err.code) err.code = "unknown";
    throw err;
  }
}

// PUBLIC_INTERFACE
function genStockMetricsFinhub(obj) {
  // Only a few live metrics are provided; others will be null.
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

// PUBLIC_INTERFACE
/** Only AAPL, used for Dashboard rendering logic */
export const SP500_TICKERS = ["AAPL"];

// If UI calls this, proxy to finhub logic for now
/** @deprecated use fetchFinhubAAPL */
export async function fetchAlphaVantageBatch() {
  return fetchFinhubAAPL();
}

/** @deprecated Only AAPL. Included for UI legacy interface. */
export async function fetchSP500Stocks() {
  return SP500_TICKERS;
}
