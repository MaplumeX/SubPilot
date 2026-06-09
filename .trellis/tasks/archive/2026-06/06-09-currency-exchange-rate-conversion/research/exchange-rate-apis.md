# Research: Free Currency Exchange Rate APIs

- **Query**: Free exchange rate APIs for a personal subscription tracker (Python/FastAPI backend)
- **Scope**: Mixed (external API research + internal project context)
- **Date**: 2026-06-09

## Findings

### Internal Project Context

The project already has the infrastructure for daily scheduled background tasks via APScheduler in `backend/app/main.py`. The `process_renewals` job runs daily, creating its own `SessionLocal()` context. This same pattern can be reused for a daily exchange rate fetch job.

**Key files**:

| File Path | Description |
|---|---|
| `backend/app/main.py` | APScheduler setup, lifespan, daily job pattern |
| `backend/app/services/renewal.py` | Background service pattern (accepts `db: Session`) |
| `backend/app/config.py` | pydantic-settings BaseSettings (can add API config) |
| `backend/app/models/subscription.py` | `currency` field (String(3), default "CNY") |
| `backend/app/routers/subscriptions.py` | `get_stats()` — currently sums without currency conversion |
| `backend/app/schemas/subscription.py` | `SubscriptionStats` — no currency field currently |
| `backend/app/database.py` | SQLAlchemy/SQLite setup |
| `backend/app/models/user.py` | User model with `locale` field, no `base_currency` yet |
| `frontend/src/components/SubscriptionForm.tsx` | `CURRENCIES = ["CNY", "USD", "EUR", "GBP", "JPY"]` |
| `frontend/src/pages/DashboardPage.tsx` | Hardcoded CNY display |
| `backend/requirements.txt` | No HTTP client (httpx/requests) yet |

**No existing caching infrastructure** in the backend. The project uses SQLite as its database.

---

### API Comparison

#### 1. open.er-api.com (ExchangeRate-API Open Access)

- **URL**: `https://open.er-api.com/v6/latest/{BASE}`
- **Free tier**: No API key required, no registration. Truly open access.
- **Rate limits**: Soft rate limit. Requesting once per 24 hours is fine. Requesting once per hour is also fine. Rate-limited IPs get HTTP 429 for 20 minutes. No hard monthly cap published.
- **Data updates**: Once per day (response includes `time_next_update_utc`)
- **Data source**: Multiple institutional sources (not disclosed specifically). Claims "multiple sources for stable & reliable FX data."
- **Currencies supported**: 166 currencies including CNY, USD, EUR, GBP, JPY
- **Attribution**: Required — must link to `https://www.exchangerate-api.com`
- **Response format**: Returns ALL rates from the chosen base currency in a single call (no pair-by-pair needed)
- **Availability features**: Response includes `time_eol_unix` field that warns of endpoint deprecation in advance. Uptime monitored via Pingdom.
- **Response size**: ~3 KB per request (full rates object with 166 currencies)

**Example response** (base USD):
```json
{
  "result": "success",
  "provider": "https://www.exchangerate-api.com",
  "documentation": "https://www.exchangerate-api.com/docs/free",
  "time_last_update_utc": "Tue, 09 Jun 2026 00:02:31 +0000",
  "time_next_update_utc": "Wed, 10 Jun 2026 00:21:01 +0000",
  "base_code": "USD",
  "rates": {
    "USD": 1,
    "CNY": 6.794828,
    "EUR": 0.867245,
    "GBP": 0.749553,
    "JPY": 160.141058,
    // ... 161 more currencies
  }
}
```

**Live rate verification** (2026-06-09):
| From USD | Rate |
|----------|------|
| CNY | 6.794828 |
| EUR | 0.867245 |
| GBP | 0.749553 |
| JPY | 160.141058 |

**Pros**: No key needed, simple, all currencies in one call, daily update, built-in next-update timestamp, deprecation warning field.
**Cons**: Attribution required, only daily updates, endpoint is on `open.er-api.com` (not the main `exchangerate-api.com` domain — slight concern about long-term support), no historical rates on free tier.

---

#### 2. exchangerate-api.com v4 (Free Tier with API Key)

- **URL**: `https://api.exchangerate-api.com/v4/latest/{BASE}`
- **Free tier**: Requires API key (free signup, no credit card). 1,500 requests per month.
- **Rate limits**: 1,500 requests/month
- **Data updates**: Once per day
- **Data source**: Same provider as open.er-api.com
- **Currencies supported**: 166 currencies (same dataset)
- **Attribution**: Not required (unlike open access)
- **Response format**: Returns all rates from base currency in single call
- **Response size**: ~3 KB per request

**Example response** (base USD):
```json
{
  "provider": "https://www.exchangerate-api.com",
  "WARNING_UPGRADE_TO_V6": "...",
  "terms": "https://www.exchangerate-api.com/terms",
  "base": "USD",
  "date": "2026-06-09",
  "time_last_updated": 1749427201,
  "rates": {
    "USD": 1,
    "CNY": 6.79,
    "EUR": 0.867,
    "GBP": 0.75,
    "JPY": 160.14,
    // ... 162 more
  }
}
```

**Note**: The v6 endpoint (`https://v6.exchangerate-api.com/v6/{KEY}/latest/{BASE}`) is the newer version but requires a key. The v4 endpoint also now requires a key. The open.er-api.com endpoint is the only keyless option from this provider.

**Pros**: No attribution required, familiar provider, 1,500 req/month is plenty for daily fetch.
**Cons**: Requires signup and API key, v4 may be deprecated (WARNING_UPGRADE_TO_V6 in response), fewer precision digits than open.er-api.com.

---

#### 3. Frankfurter (frankfurter.dev) — ECB Data

- **URL**: `https://api.frankfurter.dev/v1/latest?from={BASE}&to={TARGET1,TARGET2,...}`
- **Free tier**: Completely free, no API key, no registration. Open source (GitHub: hakanensari/frankfurter, 1,567 stars).
- **Rate limits**: No explicit published rate limit. The project asks users to be reasonable. The API is hosted on Cloudflare with CDN caching (cache-control: public, max-age=86400).
- **Data updates**: Daily, based on ECB (European Central Bank) reference rates. ECB publishes on business days only; weekends/holidays use the last available rate.
- **Data source**: European Central Bank reference rates (authoritative institutional source).
- **Currencies supported**: 30 currencies (focuses on major currencies). All 5 needed currencies (CNY, USD, EUR, GBP, JPY) are supported.
- **Attribution**: Not required (open source, MIT-like).
- **Response format**: Supports both "all rates from base" and "specific target currencies" via the `to` parameter. Much smaller response when filtering.
- **Response size**: ~433 bytes full, ~111 bytes with filtered `to` parameter.
- **Unique features**:
  - Historical rates: `GET /v1/2024-01-01?from=USD&to=CNY`
  - Time series: `GET /v1/2024-01-01..2024-01-05?from=USD&to=CNY`
  - Currency list: `GET /v1/currencies`
  - Weekend/holiday handling: automatically returns the last business day's rate.

**Example response** (base USD, filtered targets):
```json
{
  "amount": 1.0,
  "base": "USD",
  "date": "2026-06-08",
  "rates": {
    "CNY": 6.7819,
    "EUR": 0.86655,
    "GBP": 0.74835,
    "JPY": 159.97
  }
}
```

**Live rate verification** (2026-06-09):
| From USD | Rate |
|----------|------|
| CNY | 6.7819 |
| EUR | 0.86655 |
| GBP | 0.74835 |
| JPY | 159.97 |

**Weekend handling test** (queried 2026-01-03, a Saturday):
- Response date automatically shifted to 2026-01-02 (Friday), returning that day's rate.
- This is excellent — no errors on weekends/holidays.

**Pros**: No key needed, no attribution, open source with active maintenance, ECB institutional data, supports historical + time series, very compact responses when using `to` filter, great weekend/holiday handling.
**Cons**: Only 30 currencies (not an issue for this project — all 5 are covered), ECB data means EUR is the "native" base (non-EUR rates may have slightly different precision), depends on a solo open-source maintainer.

---

#### 4. Other APIs Evaluated (Rejected)

| API | Status | Reason for Rejection |
|------|--------|---------------------|
| exchangerate.host | Requires API key (was free before, now paid) | No longer has free tier |
| fixer.io (APILayer) | Requires paid key | Free tier very limited (EUR base only, no HTTPS on free) |
| currencyapi.com | Requires API key | No free tier available |
| exchangerate-api.com v6 | Requires API key + paid for meaningful use | Free key rate limits unclear |

---

### Cross-Validation of Rates

Rates from the three viable APIs are very close (max difference 0.22% for GBP):

| Currency | open.er-api | ER-API v4 | Frankfurter | Max Diff % |
|----------|------------|-----------|-------------|-----------|
| CNY | 6.7948 | 6.7900 | 6.7819 | 0.19% |
| EUR | 0.8672 | 0.8670 | 0.8666 | 0.08% |
| GBP | 0.7496 | 0.7500 | 0.7483 | 0.22% |
| JPY | 160.1411 | 160.1400 | 159.9700 | 0.11% |

All three APIs produce consistent rates. For a subscription tracker, the sub-0.25% differences are negligible.

---

### Recommendation for This Project

**Primary: Frankfurter (frankfurter.dev)**

Reasons:
1. No API key needed — zero setup friction for a hobby project
2. No attribution required — cleaner codebase
3. Supports exact currency filtering via `to` parameter — only fetches the 5 currencies needed (~111 bytes vs ~3 KB)
4. ECB institutional data source — authoritative
5. Built-in weekend/holiday handling — no errors or missing data on non-business days
6. Historical rates and time series available — future-proofing for trend analysis
7. Active open-source project (1,567 GitHub stars, updated 2026-06-09)

**Fallback: open.er-api.com**

If Frankfurter goes down, open.er-api.com is the backup. Same data quality, also keyless, just requires attribution and returns all 166 currencies (slightly more bandwidth).

---

### Caching Strategies

Given the project's architecture (SQLite, APScheduler for daily jobs, FastAPI), there are three viable caching approaches:

#### Option A: SQLite Table (Recommended for this project)

- Create an `exchange_rates` table in the existing SQLite database
- Fits naturally with the existing SQLAlchemy/alembic setup
- The daily APScheduler job (following the `process_renewals` pattern) fetches rates and upserts into the table
- The `get_stats()` endpoint reads from the table synchronously (same DB session)
- No extra dependencies, no cache invalidation complexity
- Survives restarts (unlike in-memory cache)

**Schema sketch**:
```python
class ExchangeRate(Base):
    __tablename__ = "exchange_rates"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    base_currency: Mapped[str] = mapped_column(String(3))
    target_currency: Mapped[str] = mapped_column(String(3))
    rate: Mapped[float] = mapped_column(Float)
    date: Mapped[date] = mapped_column(Date)  # date of the rate
    updated_at: Mapped[datetime] = mapped_column(DateTime)
    # Composite unique on (base_currency, target_currency, date)
```

**Pros**: Persists across restarts, consistent with project patterns, queryable, no extra deps.
**Cons**: Slight migration overhead, DB read on every stats call (negligible for SQLite + small data).

#### Option B: In-memory Cache with TTL

- Use Python `dict` or `cachetools.TTLCache` with 24-hour TTL
- Very fast reads, zero DB overhead
- Simple implementation

**Pros**: Fastest possible reads.
**Cons**: Lost on restart, needs careful TTL management, not consistent with project's DB-first approach, doesn't track which date the rate is from.

#### Option C: File-based Cache

- Write JSON to a file (e.g., `cache/exchange_rates.json`)
- Simple, persists across restarts

**Pros**: Simple, persists.
**Cons**: Not queryable, race conditions on concurrent writes, doesn't fit the project's SQLAlchemy/alembic workflow, no schema migrations.

**Assessment**: Option A (SQLite table) is the best fit because:
- The project already uses SQLAlchemy + alembic migrations
- The daily APScheduler job pattern is already established
- The `get_stats()` function already queries the DB — reading exchange rates from the same session is natural
- Survives server restarts (unlike in-memory)
- Trackable date per rate (know exactly which day's ECB rate you're using)
- Only 5 currencies x 5 base combos = 25 rows max at any time

---

### Integration Pattern

Based on the existing project architecture, the integration would follow this pattern:

1. **New model**: `backend/app/models/exchange_rate.py` — ExchangeRate SQLAlchemy model
2. **New service**: `backend/app/services/exchange_rate.py` — fetch + upsert logic
3. **New scheduled job** in `main.py` lifespan: daily fetch from frankfurter.dev
4. **Modify `get_stats()`**: convert each subscription's price to base currency using cached rates before summing
5. **HTTP client**: Need to add `httpx` to requirements.txt (not currently present; requests not in deps either; `urllib.request` from stdlib also works but httpx is more idiomatic for FastAPI)

**API endpoint to use** (Frankfurter):
```
GET https://api.frankfurter.dev/v1/latest?from={BASE}&to=CNY,USD,EUR,GBP,JPY
```

For all 5 possible base currencies, that's 5 requests per day — well within any rate limit.

Alternatively, just fetch with USD base once per day and compute cross-rates mathematically (rate from A to B = rate_B / rate_A when both are relative to USD). This reduces to 1 API call per day.

**Cross-rate computation**:
```python
# If we have rates relative to USD:
usd_to_cny = 6.78
usd_to_eur = 0.87
# Then EUR to CNY = usd_to_cny / usd_to_eur = 7.79
```

This approach (1 USD-based fetch + cross-rate computation) is the most efficient and sufficient for this use case.

---

## Caveats / Not Found

- Frankfurter's exact rate limit policy is not published — the project simply asks for reasonable use. For 1-5 requests/day, this is not a concern.
- ECB rates are "reference rates" published around 16:00 CET on business days — they are not real-time market rates. For a subscription tracker, this is perfectly fine.
- If Frankfurter goes offline permanently, switching to open.er-api.com requires changing 1 URL and adding attribution.
- The `httpx` dependency needs to be added to `requirements.txt` (or use `urllib.request` from stdlib to avoid a new dependency).
- None of these free APIs provide real-time rates — they all update once per day at most. This is appropriate for the use case.
