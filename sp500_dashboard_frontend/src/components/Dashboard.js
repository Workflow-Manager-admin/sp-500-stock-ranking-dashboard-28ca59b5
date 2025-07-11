import React, { useEffect, useState } from "react";
import { fetchSP500Stocks, fetchAlphaVantageBatch, SP500_TICKERS } from "../services/stockService";
import { getDisposition, getDispositionColor } from "../utils/stockUtils";
import "./Dashboard.css";

// PUBLIC_INTERFACE
function Dashboard() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiTimestamp, setApiTimestamp] = useState(null);
  const [error, setError] = useState(null);

  // Alpha Vantage connection/response status
  const [avStatus, setAvStatus] = useState({
    state: "idle", // "idle" | "connecting" | "connected" | "error"
    message: null,
    details: null,
  });

  /**
   * Fetch stock data in batches for 100 tickers,
   * updating connection status for user visibility.
   */
  useEffect(() => {
    let isMounted = true; // To avoid setting state on unmounted
    setLoading(true);
    setError(null);
    setAvStatus({ state: "connecting", message: "Connecting to Alpha Vantage...", details: null });

    async function fetchAll() {
      try {
        let results = [];
        let timestamp = null;
        for (let i = 0; i < 100; i += 20) {
          const tickersSlice = SP500_TICKERS.slice(i, i + 20);
          try {
            const { stocks, meta } = await fetchAlphaVantageBatch(tickersSlice);
            if (!timestamp && meta?.timestamp) timestamp = meta.timestamp;
            results = [...results, ...stocks];
            // For the first successful batch, set connection status to 'connected'
            if (isMounted && avStatus.state === "connecting") {
              setAvStatus({ state: "connected", message: "Connected (Live Data)", details: null });
            }
          } catch (batchError) {
            // Enhanced error analysis from fetchAlphaVantageBatch
            let friendlyMsg = "Alpha Vantage error";
            let techMsg = batchError?.message || (typeof batchError === "string" ? batchError : "Unknown error");
            // Use .code from enhanced error, if available
            switch (batchError?.code) {
              case "401":
                friendlyMsg = "API key missing or invalid. Please set a valid Alpha Vantage API key in configuration.";
                break;
              case "429":
                friendlyMsg = "API rate limit exceeded: Too many requests. Please wait a few minutes and try again, or upgrade your Alpha Vantage plan.";
                break;
              case "network":
                friendlyMsg = "Network error: Alpha Vantage is unreachable. Please check your internet connection, browser network settings, or CORS.";
                break;
              case "endpoint":
                friendlyMsg = "The Alpha Vantage endpoint used is unavailable or deprecated. Please check the fetch endpoint in the source code.";
                break;
              case "invalid-json":
                friendlyMsg = "Alpha Vantage returned an invalid or corrupted response. Try again later.";
                break;
              case "other":
                friendlyMsg = techMsg; // Already user-friendly
                break;
              default:
                friendlyMsg = "Failed to fetch live stock data from Alpha Vantage. Please try again later.";
            }
            if (isMounted) {
              setAvStatus({
                state: "error",
                message: friendlyMsg +
                  (techMsg && techMsg !== friendlyMsg ? `\nDetails: ${techMsg}` : ""),
                details: techMsg
              });
              setError(
                `Alpha Vantage API Error: ${friendlyMsg}` +
                  (techMsg && techMsg !== friendlyMsg ? `\n(${techMsg})` : "")
              );
              setLoading(false);
              return;
            }
          }
          await new Promise(res => setTimeout(res, 1000));
        }
        if (isMounted) {
          setStocks(results);
          setApiTimestamp(timestamp);
          // If we never surfaced 'connected', do so now (for e.g. tickers==0)
          if (avStatus.state === "connecting") {
            setAvStatus({ state: "connected", message: "Connected (Live Data)", details: null });
          }
          setLoading(false);
        }
      } catch (e) {
        if (isMounted) {
          setError("Failed to fetch stock data. Please try again later.");
          setAvStatus({ state: "error", message: "Alpha Vantage Error: " + (e?.message || "Unknown error"), details: e?.message || "" });
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
    if (avStatus.state === "connecting") {
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
          🔌 Connecting to Alpha Vantage...
        </div>
      );
    }
    if (avStatus.state === "connected") {
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
    if (avStatus.state === "error") {
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
          ❌ {avStatus.message}
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
                  <td className="table-price">${typeof stock.price === "number" ? stock.price.toFixed(2) : "N/A"}</td>
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
