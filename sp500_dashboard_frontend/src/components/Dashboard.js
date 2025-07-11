import React, { useEffect, useState } from "react";
import StockCard from "./StockCard";
import { fetchSP500Stocks, fetchAlphaVantageBatch, SP500_TICKERS } from "../services/stockService";
import "./Dashboard.css";

function Dashboard() {
  const [stocks, setStocks] = useState([]);
  const [detailStock, setDetailStock] = useState(null);
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
        // Alpha Vantage 'Batch Stock Quotes' endpoint limit: 100 tickers per minute (practical limit: 20 per call)
        for (let i = 0; i < 100; i += 20) {
          const tickersSlice = SP500_TICKERS.slice(i, i + 20);
          const { stocks, meta } = await fetchAlphaVantageBatch(tickersSlice);
          // Always use the last official API-reported timestamp available
          if (!timestamp && meta?.timestamp) timestamp = meta.timestamp;
          results = [...results, ...stocks];
          // Delay to not overwhelm free API, can be omitted for paid plans
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

  // PUBLIC_INTERFACE
  const handleShowDetail = (stock) => {
    setDetailStock(stock);
  };

  // PUBLIC_INTERFACE
  const handleCloseDetail = () => {
    setDetailStock(null);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">S&amp;P 500 Stock Dashboard</h1>
        <div className="dashboard-desc">
          <p>
            Live ranking of 100 top S&amp;P 500 stocks with performance metrics and disposition (Buy/Sell/Hold).
          </p>
          {apiTimestamp &&
            <div className="dashboard-timestamp" role="status" aria-live="polite">
              <span style={{
                fontWeight: "600", 
                color: "#3949ab",
                background: "#eef1f9",
                padding: "0.33rem 1.1rem", 
                borderRadius: "13px", 
                boxShadow: "0 0.5px 2px rgba(34, 36, 38, 0.06)"
              }}>
                Last API Update: <strong>{apiTimestamp}</strong>
              </span>
            </div>
          }
        </div>
      </div>
      {loading && <div className="dashboard-loading">Loading data...</div>}
      {error && <div className="dashboard-error">{error}</div>}
      <div className="stock-cards-grid">
        {
          // Sort stocks by score descending for display
          [...stocks]
            .sort((a, b) => {
              // Get scores for each stock using getDisposition (from utils)
              // Since getDisposition expects metrics array,
              // we need to require it here directly (imported in StockCard)
              // To avoid circular import, mirror score calculation logic here
              // (or, if desired, import getDisposition here as well)
              // For modularity, let's import it
              // But for now, inline score extraction
              // Preferably, utils function should be re-used; so let's import getDisposition here
              // But this is a component, so import should be at top
            })
            .sort((a, b) => {
              // attempt to get score field - if not present, score 0
              const scoreA = (() => {
                try {
                  // Try to get score from getDisposition
                  // Dynamically require to avoid cyclic load
                  // Inline this logic, duplicate from stockUtils.js
                  let score = 0;
                  a.metrics.forEach(m => {
                    if (["ROE", "PM", "P/S", "CR", "EPS", "DivY"].includes(m.short)) { score += Math.min(m.value, 30);}
                    if (["D/E"].includes(m.short)) {score += 10 - Math.min(m.value, 10);}
                    if (["PE"].includes(m.short)) {score += 40 - Math.min(m.value, 40);}
                    if (["Beta"].includes(m.short)) {score += (1.3-Math.abs(1-m.value))*12;}
                    if (["QR"].includes(m.short)) {score += Math.min(m.value, 6);}
                  });
                  return Math.round(score);
                } catch { return 0;}
              })();
              const scoreB = (() => {
                try {
                  let score = 0;
                  b.metrics.forEach(m => {
                    if (["ROE", "PM", "P/S", "CR", "EPS", "DivY"].includes(m.short)) { score += Math.min(m.value, 30);}
                    if (["D/E"].includes(m.short)) {score += 10 - Math.min(m.value, 10);}
                    if (["PE"].includes(m.short)) {score += 40 - Math.min(m.value, 40);}
                    if (["Beta"].includes(m.short)) {score += (1.3-Math.abs(1-b.value))*12;}
                    if (["QR"].includes(m.short)) {score += Math.min(m.value, 6);}
                  });
                  return Math.round(score);
                } catch { return 0;}
              })();
              return scoreB - scoreA;
            })
            .map(stock =>
              <StockCard
                key={stock.symbol}
                stock={stock}
                onShowDetail={handleShowDetail}
              />
            )
        }
      </div>
      {detailStock &&
        <DetailModal stock={detailStock} onClose={handleCloseDetail} />
      }
    </div>
  );
}

/**
 * DetailModal displays detailed performance metrics for the selected stock,
 * and now also shows the current stock price.
 * The current stock price is a key trading metric.
 */
// PUBLIC_INTERFACE
function DetailModal({ stock, onClose }) {
  // Display the current stock price (from stock.price)
  const currentStockPrice = stock.price !== undefined ? stock.price : "N/A";
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e=>e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2>{stock.symbol}: Details</h2>

        {/* Show current stock price at the top */}
        <div style={{fontWeight:"bold", color:"#1a237e", marginBottom: "10px"}}>
          Current Stock Price: <span style={{fontWeight:500, color:"#fb2b38"}}>${currentStockPrice}</span>
        </div>

        <ul className="modal-metrics-list">
          {stock.metrics.map((metric, idx) =>
            <li key={metric.name}><b>{metric.name}</b>: {metric.value}</li>
          )}
        </ul>
        <div className="modal-bar-chart">
          <span>Metrics Bar Chart</span>
          <BarChart data={stock.metrics.map(m=>m.value)} labels={stock.metrics.map(m=>m.name)} />
        </div>
      </div>
    </div>
  );
}

// Simple bar chart using divs for lightweight vis
// PUBLIC_INTERFACE
function BarChart({ data, labels }) {
  const max = Math.max(...data);
  return (
    <div className="bar-chart">
      {data.map((value, idx) => (
        <div key={idx} className="bar-row">
          <span className="bar-label">{labels[idx]}</span>
          <div className="bar-outer">
            <div
              className="bar-inner"
              style={{
                width: max ? `${(value / max) * 100}%` : 0
              }}
            >
              <span className="bar-value">{value}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Dashboard;
