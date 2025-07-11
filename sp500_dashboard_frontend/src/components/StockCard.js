import React from "react";
import { getDisposition, getDispositionColor } from "../utils/stockUtils";
import "./StockCard.css";

// PUBLIC_INTERFACE
function StockCard({ stock, onShowDetail }) {
  // Compute disposition
  const { disposition, score } = getDisposition(stock.metrics);

  // Color mapping for disposition
  const color = getDispositionColor(disposition);

  return (
    <div className="stock-card">
      <div className="stock-header">
        <span className="stock-symbol">{stock.symbol}</span>
        <span className="stock-disposition" style={{color}}>
          {disposition}
        </span>
      </div>
      <div className="stock-metrics">
        {stock.metrics.map(param =>
          <div key={param.name} className="stock-metric">
            <span className="metric-label">{param.short}</span>
            <span>{param.value}</span>
          </div>
        )}
      </div>
      <div className="stock-bottom-row">
        <div className="stock-score-bar">
          <BarChartMini data={stock.metrics.map(m=>m.value)} />
          <span className="stock-score-label">Score: {score}</span>
        </div>
        <button className="stock-details-btn" onClick={() => onShowDetail(stock)}>
          Details
        </button>
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
function BarChartMini({ data }) {
  // Normalize to 0-100 for simple chart
  const max = Math.max(...data);
  return (
    <div className="barchart-mini">
      {data.map((v, idx) =>
        <div
          key={idx}
          className="barchart-mini-bar"
          style={{
            height: max ? `${(v / max) * 30 + 5}px` : "5px"
          }}
        />
      )}
    </div>
  );
}

export default StockCard;
