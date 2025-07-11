import React, { useEffect, useState } from "react";
import { fetchFinnhubAAPL, SP500_TICKERS } from "../services/stockService";
import { getDisposition, getDispositionColor } from "../utils/stockUtils";
import "./Dashboard.css";

// PUBLIC_INTERFACE
function Dashboard() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiTimestamp, setApiTimestamp] = useState(null);
  const [error, setError] = useState(null);

  // Connection/response status for finnhub
  const [finStatus, setFinStatus] = useState({
    state: "idle", // "idle" | "connecting" | "connected" | "error"
    message: null,
    details: null,
  });

  /**
   * Fetch Apple (AAPL) data from finnhub.io.
   */
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setFinStatus({
      state: "connecting",
      message: "Connecting to finnhub.io...",
      details: null,
    });

    async function fetchAAPL() {
      try {
        const { stocks, meta } = await fetchFinnhubAAPL();
        if (isMounted) {
          setStocks(stocks);
          setApiTimestamp(meta?.timestamp || null);
          setFinStatus({
            state: "connected",
            message: "Connected (Live Data from finnhub.io)",
            details: null,
          });
          setLoading(false);
        }
      } catch (err) {
        let friendlyMsg = "finnhub.io error";
        let techMsg = err?.message || (typeof err === "string" ? err : "Unknown error");
        switch (err?.code) {
          case "401":
            friendlyMsg =
              "API key missing or invalid for finnhub.io. Please check the built-in API key.";
            break;
          case "429":
            friendlyMsg =
              "finnhub.io API rate limit exceeded. Please wait a few minutes and try again.";
            break;
          case "network":
            friendlyMsg =
              "Network error: finnhub.io is unreachable. Please check your internet connection.";
            break;
          case "invalid-json":
            friendlyMsg = "finnhub.io returned an invalid or corrupted response.";
            break;
          case "other":
            friendlyMsg = techMsg;
            break;
          default:
            friendlyMsg =
              "Failed to fetch live stock data from finnhub.io. Please try again later.";
        }
        if (isMounted) {
          setFinStatus({
            state: "error",
            message:
              friendlyMsg +
              (techMsg && techMsg !== friendlyMsg ? `\nDetails: ${techMsg}` : ""),
            details: techMsg,
          });
          setError(
            `finnhub.io API Error: ${friendlyMsg}` +
              (techMsg && techMsg !== friendlyMsg ? `\n(${techMsg})` : "")
          );
          setLoading(false);
        }
      }
    }
    fetchAAPL();
    return () => {
      isMounted = false;
    };
  }, []);

  // Only show AAPL; sort, metrics logic adapted for a single stock
  const sortableStocks = stocks
    ? [...stocks].map((stock) => {
        const { disposition, score } = getDisposition(stock.metrics);
        return {
          ...stock,
          disposition,
          score,
        };
      })
    : [];

  // Single ticker, so metrics from that one
  const metricShorts =
    stocks && stocks.length > 0
      ? stocks[0].metrics.map((m) => m.short)
      : [
          "PE",
          "EPS",
          "ROE",
          "D/E",
          "PM",
          "P/S",
          "CR",
          "QR",
          "DivY",
          "Beta",
        ];
  const metricFullNames =
    stocks && stocks.length > 0
      ? stocks[0].metrics.map((m) => m.name)
      : [
          "P/E Ratio",
          "EPS",
          "Return on Equity",
          "Debt/Equity",
          "Profit Margin (%)",
          "Price/Sales",
          "Current Ratio",
          "Quick Ratio",
          "Dividend Yield (%)",
          "Beta",
        ];

  // Status banner render for finhub.io
  const renderConnectionStatus = () => {
    if (finStatus.state === "connecting") {
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
            letterSpacing: "0.02em",
          }}
          role="status"
          aria-live="polite"
        >
          🔌 Connecting to finhub.io...
        </div>
      );
    }
    if (finStatus.state === "connected") {
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
            letterSpacing: "0.02em",
          }}
          role="status"
          aria-live="polite"
        >
          ✅ Connected (Live Data from finhub.io)
        </div>
      );
    }
    if (finStatus.state === "error") {
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
            letterSpacing: "0.02em",
          }}
          role="alert"
          aria-live="assertive"
        >
          ❌ {finStatus.message}
        </div>
      );
    }
    return null;
  };

  // Render a single-row spreadsheet-style table for AAPL only
  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Apple (AAPL) Stock Dashboard</h1>
        <div className="dashboard-desc">
          <p>
            Live real-time quote and metrics from finhub.io for ticker <strong>AAPL</strong>. 
            Data updates reflect most recent available trade.  
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
                  boxShadow: "0 0.5px 2px rgba(34, 36, 38, 0.06)",
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
            {sortableStocks.map((stock) => (
              <tr key={stock.symbol}>
                <td className="table-ticker" style={{ fontWeight: "bold" }}>
                  {stock.symbol}
                </td>
                <td
                  className="table-score"
                  style={{ fontWeight: "600", color: "#1a237e" }}
                >
                  {stock.score}
                </td>
                <td
                  className="table-disposition"
                  style={{
                    fontWeight: "500",
                    color: getDispositionColor(stock.disposition),
                  }}
                >
                  {stock.disposition}
                </td>
                <td className="table-price">
                  $
                  {typeof stock.price === "number"
                    ? stock.price.toFixed(2)
                    : "N/A"}
                </td>
                {metricShorts.map((short) => {
                  const metric = stock.metrics.find((m) => m.short === short);
                  return (
                    <td key={short} className="table-metric">
                      {typeof metric?.value === "number" ? metric.value : "N/A"}
                    </td>
                  );
                })}
                <td className="table-updated">
                  {stock.lastUpdate ? stock.lastUpdate : apiTimestamp}
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
