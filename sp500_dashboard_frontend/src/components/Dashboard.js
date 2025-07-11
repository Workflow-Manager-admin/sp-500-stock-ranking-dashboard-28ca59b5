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

  // Fetch data for all 100 tickers, staggered by 20-ticker batches due to API limits
  useEffect(() => {
    setLoading(true);
    setError(null);

    async function fetchAll() {
      try {
        let results = [];
        let timestamp = null;
        for (let i = 0; i < 100; i += 20) {
          const tickersSlice = SP500_TICKERS.slice(i, i + 20);
          const { stocks, meta } = await fetchAlphaVantageBatch(tickersSlice);
          if (!timestamp && meta?.timestamp) timestamp = meta.timestamp;
          results = [...results, ...stocks];
          await new Promise(res => setTimeout(res, 1000));
        }
        setStocks(results);
        setApiTimestamp(timestamp);
      } catch (e) {
        setError("Failed to fetch stock data. Please try again later.");
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
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
