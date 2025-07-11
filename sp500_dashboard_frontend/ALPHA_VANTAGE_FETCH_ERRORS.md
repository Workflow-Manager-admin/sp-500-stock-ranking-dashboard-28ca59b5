# Finnhub Fetch Diagnostic Report

## Fetch Test: Using your Finnhub API key

- The dashboard is now configured to use Finnhub.
- After launching, observe:
    - If real-time stock data loads without error, the key is working.
    - If "Failed to fetch stock data" or other API errors display, the key may be limited, invalid, or your rate limit is exceeded.

## Major Causes Preventing Successful Real-time Data Fetch

### 1. Missing/Invalid API Key
- The file `stockService.js` uses `REACT_APP_FINNHUB_API_KEY` for Finnhub.
- If this is not set to your real API key, all requests to Finnhub will fail with an API error (invalid key, 401, or 403).
- This triggers the dashboard "Failed to fetch stock data" error state.

### 2. Finnhub API Rate Limits
- The Finnhub free tier limits you to 60 requests/minute.
- The dashboard fetches 100 tickers, so on a free plan this may exceed the limit (~100 fetches in a minute).
- Exceeding the limit results in HTTP 429 or incomplete/inconsistent stock data.
- Errors are shown in the UI as "Finnhub API rate limit exceeded."

### 3. General Error Propagation
- Any fetch failure (network, invalid response, 4xx/5xx, quota) triggers a friendly error message for the user.
- The fetchFinnhubBatch error handler produces details for debugging.

---

## Recommendations

- Set a valid Finnhub API key (`REACT_APP_FINNHUB_API_KEY`).
- Use a paid Finnhub plan if you need higher request limits.
- If you hit rate limits, try slicing the stock list into smaller batches with a delay between groups.

---

## Error Snapshots (from code):
- If API key is missing: Results in "Unauthorized: Finnhub API key is missing or invalid."
- If rate limit exceeded: HTTP 429 "Finnhub API rate limit exceeded."
- If network issues: "Network error" in fetchFinnhubBatch catch handler.
