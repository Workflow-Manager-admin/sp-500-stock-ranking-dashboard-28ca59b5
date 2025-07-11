import React, { useEffect, useState } from "react";
import { fetchSP500Stocks, fetchFinnhubBatch, SP500_TICKERS } from "../services/stockService";
import { getDisposition, getDispositionColor } from "../utils/stockUtils";
import "./Dashboard.css";

// PUBLIC_INTERFACE
function Dashboard() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiTimestamp, setApiTimestamp] = useState(null);
  const [error, setError] = useState(null);

  // Finnhub connection/response status
  const [apiStatus, setApiStatus] = useState({
    state: "idle", // "idle" | "connecting" | "connected" | "error"
    message: null,
    details: null,
  });

  /**
   * Fetch stock data in batches for 100 tickers (parallel Finnhub fetch).
   */
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setApiStatus({ state: "connecting", message: "Connecting to Finnhub...", details: null });

    async function fetchAll() {
      try {
        // Finnhub free key: limit to 60/min, so for 100 tickers, this may sometimes hit quota.
        const { stocks: data, meta } = await fetchFinnhubBatch(SP500_TICKERS.slice(0, 100));
        if (isMounted) {
          setStocks(data);
          setApiTimestamp(meta?.timestamp || null);
          setApiStatus({ state: "connected", message: "Connected (Live Data)", details: null });
          setLoading(false);
        }
      } catch (e) {
        if (isMounted) {
          setError(
            e.code === "401"
              ? "Finnhub API key missing or invalid. Please set a valid Finnhub API key (REACT_APP_FINNHUB_API_KEY) in your .env file."
              : e.code === "429"
              ? "Finnhub API rate limit exceeded. Please wait a few minutes and try again (or use a paid Finnhub plan for higher quota)."
              : e.message || "Failed to fetch stock data."
          );
          setApiStatus({
            state: "error",
            message:
              (e.code === "401"
                ? "API key missing or invalid."
                : e.code === "429"
                ? "API rate limit exceeded. Too many requests."
                : e.message) + (e.details ? `\nDetails: ${e.details}` : ""),
            details: e.message,
          });
        }
        setLoading(false);
      }
    }
    fetchAll();
    return () => { isMounted = false; };
  }, []);

  // Compute scores for sorting and flatten metrics for header/rows
  const sortableStocks = stocks
    ? [...stocks].map(stock => {
        const { disposition, score } = getDisposition(stock.metrics);
        return {
          ...stock,
          disposition,
          score
        };
      })
    : [];

  // Identify all metrics and their (short,key) order for columns
  const metricShorts = stocks && stocks.length > 0
    ? stocks[0].metrics.map(m => m.short)
    : [
        "PE", "EPS", "ROE", "D/E", "PM", "P/S", "CR", "QR", "DivY", "Beta"
      ];
  const metricFullNames = stocks && stocks.length > 0
    ? stocks[0].metrics.map(m => m.name)
    : [
        "P/E Ratio", "EPS", "Return on Equity", "Debt/Equity", "Profit Margin (%)",
        "Price/Sales", "Current Ratio", "Quick Ratio", "Dividend Yield (%)", "Beta"
      ];

  // Status banner render
  const renderConnectionStatus = () => {
    if (apiStatus.state === "connecting") {
      return (
        <div
          className="dashboard-connstatus"
          style={{
            margin: "0.33rem 0 1.05rem 0",
            textAlign: "center",
            background: "#e2e7fa",
            color: "#3746a4",
            borderRadius: "14px",
            padding: "8px 24px",
            fontWeight: "bold",
            boxShadow: "0 1.5px 8px 0 rgba(80,80,100,0.08)",
            fontSize: "1.12rem",
            letterSpacing: "0.02em"
          }}
          role="status"
          aria-live="polite"
        >
          🔌 Connecting to Finnhub...
        </div>
      );
    }
    if (apiStatus.state === "connected") {
      return (
        <div
          className="dashboard-connstatus"
          style={{
            margin: "0.33rem 0 1.05rem 0",
            textAlign: "center",
            background: "#e6f6ed",
            color: "#17694a",
            border: "1.2px solid #acd2bd",
            borderRadius: "14px",
            padding: "8px 24px",
            fontWeight: "bold",
            boxShadow: "0 1.5px 8px 0 rgba(80,100,110,0.07)",
            fontSize: "1.08rem",
            letterSpacing: "0.02em"
          }}
          role="status"
          aria-live="polite"
        >
          ✅ Connected (Live Data)
        </div>
      );
    }
    if (apiStatus.state === "error") {
      return (
        <div
          className="dashboard-connstatus"
          style={{
            margin: "0.33rem 0 1.05rem 0",
            textAlign: "center",
            background: "#ffe4e2",
            color: "#bd303f",
            border: "1.2px solid #e76969",
            borderRadius: "14px",
            padding: "8px 24px",
            fontWeight: "bold",
            boxShadow: "0 1.5px 8px 0 rgba(180,60,60,0.08)",
            fontSize: "1.09rem",
            letterSpacing: "0.02em"
          }}
          role="alert"
          aria-live="assertive"
        >
          ❌ {apiStatus.message}
        </div>
      );
    }
    return null;
  }

  // Render the spreadsheet-style table
  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">S&amp;P 500 Stock Dashboard</h1>
        <div className="dashboard-desc">
          <p>
            Live ranking of 100 top S&amp;P 500 stocks with performance metrics and disposition (Buy/Sell/Hold).
            All stocks are sorted by score (desc).
          </p>
          {renderConnectionStatus()}
          {apiTimestamp && (
            <div className="dashboard-timestamp" role="status" aria-live="polite">
              <span
                style={{
                  fontWeight: "600",
                  color: "#3949ab",
                  background: "#eef1f9",
                  padding: "0.33rem 1.1rem",
                  borderRadius: "13px",
                  boxShadow: "0 0.5px 2px rgba(34, 36, 38, 0.06)"
                }}
              >
                Last API Update: <strong>{apiTimestamp}</strong>
              </span>
            </div>
          )}
        </div>
      </div>
      {loading && <div className="dashboard-loading">Loading data...</div>}
      {error && <div className="dashboard-error">{error}</div>}

      <div className="dashboard-table-responsive">
        <table className="dashboard-table" role="table">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Score</th>
              <th>Disposition</th>
              <th>Current Price</th>
              {metricShorts.map((short, idx) => (
                <th key={short} title={metricFullNames[idx]}>
                  {short}
                </th>
              ))}
              <th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {sortableStocks
              .sort((a, b) => b.score - a.score)
              .map(stock => (
                <tr key={stock.symbol}>
                  <td className="table-ticker" style={{fontWeight:"bold"}}>{stock.symbol}</td>
                  <td className="table-score" style={{fontWeight:"600", color:"#1a237e"}}>{stock.score}</td>
                  <td className="table-disposition" style={{fontWeight:"500", color:getDispositionColor(stock.disposition)}}>
                    {stock.disposition}
                  </td>
                  <td className="table-price">${typeof stock.price === "number" ? stock.price?.toFixed(2) : "N/A"}</td>
                  {metricShorts.map(short => {
                    const metric = stock.metrics.find(m => m.short === short);
                    return (
                      <td key={short} className="table-metric">
                        {typeof metric?.value === "number" ? metric.value : "N/A"}
                      </td>
                    );
                  })}
                  <td className="table-updated">
                    {stock.lastUpdate
                      ? stock.lastUpdate
                      : apiTimestamp}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Dashboard;
