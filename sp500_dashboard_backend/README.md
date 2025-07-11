# sp500_dashboard_backend

Backend aggregator/proxy for S&P 500 dashboard app.

## Purpose

Aggregates/caches Alpha Vantage API requests for S&P 500 and provides a stable backend for the React frontend, avoiding API rate limits and providing a single API endpoint for frontend data.

## Quickstart

1. Copy `.env.example` to `.env` and add your Alpha Vantage API key.
2. Install dependencies:
   ```
   npm install
   ```
3. Start the server:
   ```
   npm start
   ```
   (Development mode with auto-reload: `npm run dev`)

## API Endpoints

### Health check

- `GET /api/health`  
  Returns `{ status: "ok", service: "sp500_dashboard_backend" }`

### Alpha Vantage aggregation proxy

- `GET /api/alpha/batch?symbols=AAPL,MSFT,GOOGL,...`  
  Proxies/caches batch or per-ticker stock data from Alpha Vantage.

#### Example response

```
{
  "stocks": [
    { "symbol": "AAPL", "price": 147.2, "volume": 12450000, ... },
    ...
  ],
  "meta": {
    "timestamp": "2024-06-11T10:50:29Z"
  }
}
```

## Environment Variables

- `ALPHA_VANTAGE_API_KEY`: Your Alpha Vantage API key (required)
- `PORT`: Port to run backend (default: 4000)
