# Alpha Vantage Fetch Diagnostic Report

## Major Causes Preventing Successful Real-time Data Fetch

### 1. Missing/Invalid API Key
- The file `stockService.js` uses a hardcoded value for `ALPHA_VANTAGE_API_KEY` (`"YOUR_REAL_ALPHA_VANTAGE_API_KEY"`).
- If this placeholder is not replaced with a real key, _all requests_ to Alpha Vantage will fail with an API error (invalid key, 401, or empty data).
- This will cause fetchAlphaVantageBatch to throw, and the dashboard will display "Failed to fetch stock data."

### 2. Alpha Vantage API Limits
- The Alpha Vantage free tier limits requests to 5 per minute.
- The batch fetching logic loops in increments of 20 and waits only 1 second between requests (for 100 stocks: 5 calls in ~5 seconds).
- If the API key is on a free plan, this will lead to HTTP 429 (Too Many Requests) errors or empty data responses.
- This may also manifest as other unspecified fetch errors due to rate limiting.

### 3. Alpha Vantage Endpoint/Field Issues
- The BATCH_STOCK_QUOTES endpoint in Alpha Vantage is deprecated for most accounts and may return empty/malformed data.
- If "Meta Data" and "Stock Quotes" are missing after a request, the code falls back to a much slower per-symbol "GLOBAL_QUOTE" mode, which multiplies API calls and increases the risk of rate limit errors.

### 4. General Error Propagation
- If the fetch fails at any point (network, 4xx/5xx, API limit, invalid key, other), the catch handler in fetchAlphaVantageBatch simply throws `"Failed to fetch live data from Alpha Vantage API."`, which triggers the generic dashboard error message.

---

## Recommendations

- Set a valid API key for Alpha Vantage (`ALPHA_VANTAGE_API_KEY`).
- Implement or increase local throttling/backoff to respect API limits (especially for free-tier keys).
- Check for and handle HTTP 429/401 errors explicitly for clearer user messaging.
- Consider using a backend service for caching/aggregation if higher call volume is needed.

---

## Error Snapshots (from code):
- If API key is missing: Results in error message "Invalid API call" or no data.
- If rate limit exceeded: HTTP 429 or empty data, causing the error state to trigger.
- Catch clause in fetchAlphaVantageBatch: "Failed to fetch live data from Alpha Vantage API."
