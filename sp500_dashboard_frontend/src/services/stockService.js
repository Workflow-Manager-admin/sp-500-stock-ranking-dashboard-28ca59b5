/**
 * Service for fetching and processing S&P 500 stock data
 * Features: Batching Alpha Vantage queries, calculating metrics, disposition, API data shape to dashboard shape.
 */

const ALPHA_VANTAGE_API_KEY = "demo"; // Replace "demo" with a real key for production.
const ALPHA_VANTAGE_BASE = "https://www.alphavantage.co/query";

/**
 * Utility: Fetch stock quote batch (up to 100).
 * Returns: { stocks: [{ symbol, metrics: [...], ... }], meta: { timestamp } }
 */
// PUBLIC_INTERFACE
export async function fetchAlphaVantageBatch(tickers) {
  // Rate limit: 5/min free. Use mock if exceeds.
  const symbols = tickers.join(",");
  // Use the 'BATCH_STOCK_QUOTES' endpoint; fallback = 'GLOBAL_QUOTE' one by one.
  let stocks = [];
  let meta = {};
  try {
    const url = `${ALPHA_VANTAGE_BASE}?function=BATCH_STOCK_QUOTES&symbols=${symbols}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("API error");
    const obj = await res.json();

    if (obj["Stock Quotes"]) {
      stocks = obj["Stock Quotes"].map(mapAlphaToStock);
      meta.timestamp = new Date().toLocaleString();
    } else {
      // Alpha Vantage fallback: get individually
      stocks = await Promise.all(
        tickers.map(async sym => {
          const singleUrl = `${ALPHA_VANTAGE_BASE}?function=GLOBAL_QUOTE&symbol=${sym}&apikey=${ALPHA_VANTAGE_API_KEY}`;
          const r = await fetch(singleUrl);
          const o = await r.json();
          return mapAlphaToStockSingle(o, sym);
        })
      );
      meta.timestamp = new Date().toLocaleString();
    }
  } catch {
    // On error, use mock data
    stocks = tickers.map(ticker => mockStockData(ticker));
    meta.timestamp = "(mocked)";
  }
  // Compute random metrics and full stock object
  stocks = stocks.map(s => ({
    ...s,
    metrics: genStockMetrics(s),
  }));
  return { stocks, meta };
}

// PUBLIC_INTERFACE
function mapAlphaToStock(item) {
  return {
    symbol: item["1. symbol"],
    price: Number(item["2. price"]),
    volume: Number(item["3. volume"]),
  };
}

// PUBLIC_INTERFACE
function mapAlphaToStockSingle(obj, sym) {
  // Alpha Vantage single quote in obj["Global Quote"]
  const d = obj["Global Quote"];
  return {
    symbol: d["01. symbol"] || sym,
    price: Number(d["05. price"]||0),
    volume: Number(d["06. volume"]||0)
  };
}

// PUBLIC_INTERFACE
function mockStockData(symbol) {
  return {
    symbol,
    price: Math.round(80+Math.random()*2500)/5,
    volume: Math.floor(700000 + Math.random()*5000000),
  };
}

// PUBLIC_INTERFACE
function genStockMetrics(stock) {
  // 10 Performance Metrics. You would normally compute or fetch these.
  // Let's create realistic mock metrics based on price and some randomization.
  const metrics = [
    { name: "P/E Ratio", short: "PE", value: Math.round((Math.random()*30+7)*10)/10 },
    { name: "EPS", short: "EPS", value: Math.round((Math.random()*10+2)*100)/100 },
    { name: "Return on Equity", short: "ROE", value: Math.round((Math.random()*25+5)*10)/10 },
    { name: "Debt/Equity", short: "D/E", value: Math.round((Math.random()*3+.1)*100)/100 },
    { name: "Profit Margin (%)", short: "PM", value: Math.round((Math.random()*25+3)*100)/100 },
    { name: "Price/Sales", short: "P/S", value: Math.round((Math.random()*10+2)*100)/100 },
    { name: "Current Ratio", short: "CR", value: Math.round((Math.random()*1.5+0.8)*100)/100 },
    { name: "Quick Ratio", short: "QR", value: Math.round((Math.random()*1.5+0.7)*100)/100 },
    { name: "Dividend Yield (%)", short: "DivY", value: Math.round((Math.random()*4+0.5)*100)/100 },
    { name: "Beta", short: "Beta", value: Math.round((Math.random()*1.5+0.5)*100)/100 },
  ];
  return metrics;
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

