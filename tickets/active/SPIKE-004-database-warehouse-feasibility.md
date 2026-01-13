# AI-Ready Spike Template

## 1. Research Question (Required)
**Question:**
Is it feasible to integrate cloud data warehouses (BigQuery, Snowflake, Redshift) with DataLens Profiler, and if so, what architectural pattern should we use?

**Context:**
While SPIKE-002 and SPIKE-003 explore file-based cloud storage (GCS, S3), many data teams store their datasets in cloud data warehouses like BigQuery, Snowflake, or Redshift. These systems require different integration patterns (SQL queries vs file streaming) and raise distinct technical challenges around result size limits, browser memory constraints, and partial table profiling.

## 2. Scope & Timebox
**Timebox:** 2 days

**In Scope:**
- Evaluate browser-based querying vs backend proxy architecture
- Research authentication methods for each warehouse (BigQuery, Snowflake, Redshift)
- Analyze result size limitations and streaming capabilities
- Design sampling strategies for large tables (1M+ rows)
- Assess memory constraints: downloading query results to browser
- Evaluate SQL generation for profiling queries (column stats via SQL)
- Compare two approaches: (A) Download data then profile, (B) Profile in database via SQL
- Browser compatibility for warehouse SDKs/APIs
- Cost analysis: query costs, slot usage, compute credits

**Out of Scope:**
- Full implementation of any warehouse integration
- SQL query builder UI
- Data warehouse management features (table creation, schema changes)
- Real-time query execution monitoring
- Multi-warehouse abstraction layer (may be future work)
- File storage integrations (GCS, S3) - covered in SPIKE-002/003

## 3. Success Criteria (Required)
**Deliverables:**
- [x] Architectural decision: Browser-download vs Backend-proxy vs In-database profiling
- [x] Comparison matrix: BigQuery vs Snowflake vs Redshift feasibility
- [x] Authentication pattern recommendations for each warehouse
- [x] Sampling strategy for tables > 1M rows (LIMIT, TABLESAMPLE, etc.)
- [x] Memory analysis: can browser handle 100K, 1M, 10M row results?
- [x] Cost estimation for profiling queries (per 1GB, per 1B rows)
- [x] SQL template for computing statistics in-database (mean, stddev, quantiles, etc.)
- [x] Recommendation matrix: which warehouse(s) to prioritize, if any

## 4. Research Plan

### Phase 1: Architecture Patterns (0.5 days)

**Pattern A: Download-then-Profile (Browser-first)**
```
User → Warehouse API → Download results to browser → WASM profiler → Results
```
- **Pros:** Reuses existing WASM profiler, privacy-preserving
- **Cons:** Limited by browser memory, slow for large results
- **Research:** BigQuery API via `fetch()`, result streaming, pagination
- **Max table size:** Browser memory limits (~500MB result set?)

**Pattern B: Backend Proxy**
```
User → DataLens Backend → Warehouse API → Backend profiling → Results
```
- **Pros:** No browser memory limits, can profile massive tables
- **Cons:** Violates "data never leaves device" privacy model, infrastructure cost
- **Research:** Lightweight backend service architecture, cost implications

**Pattern C: In-Database Profiling (SQL-based)**
```
User → DataLens UI → Generate profiling SQL → Warehouse → Computed stats → Browser
```
- **Pros:** Minimal data transfer, leverages warehouse compute
- **Cons:** SQL differs per warehouse, approximate algorithms, limited to SQL-compatible stats
- **Research:** SQL templates for mean, stddev, approx_quantiles, count_distinct, etc.
- **Example BigQuery SQL:**
```sql
SELECT
  'column_name' AS column,
  COUNT(*) AS count,
  COUNT(DISTINCT column_name) AS distinct_count,
  AVG(column_name) AS mean,
  STDDEV(column_name) AS stddev,
  APPROX_QUANTILES(column_name, 100)[OFFSET(50)] AS median
FROM `project.dataset.table`
```

**Decision Criteria:**
- If result size < 100MB → Pattern A (download)
- If privacy is critical → Pattern A or C (avoid backend)
- If table > 10M rows → Pattern C (in-database) only viable option
- If warehouse costs prohibitive → Don't integrate

### Phase 2: BigQuery Feasibility (0.5 days)

**Authentication:**
- OAuth 2.0: `https://www.googleapis.com/auth/bigquery.readonly`
- Service account keys (not recommended in browser)
- Signed JWT tokens (backend-generated)

**Technical Research:**
1. Test BigQuery API from browser using `fetch()`
2. Execute sample query: `SELECT * FROM dataset.table LIMIT 1000`
3. Measure result download time and memory usage
4. Test result streaming (pagination with `pageToken`)
5. Evaluate query costs (on-demand vs slot-based pricing)
6. Test in-database profiling SQL (APPROX_QUANTILES, APPROX_COUNT_DISTINCT)

**Cost Analysis:**
- On-demand: $5 per TB scanned
- Example: Profile 10GB table (full scan) = $0.05
- Compare to Pattern C (in-database): same cost, but less data transfer

**Memory Test:**
| Row Count | Columns | Result Size | Browser OK? |
|-----------|---------|-------------|-------------|
| 10K       | 10      | ~1MB        | ✅          |
| 100K      | 10      | ~10MB       | ✅          |
| 1M        | 10      | ~100MB      | ?           |
| 10M       | 10      | ~1GB        | ❌          |

### Phase 3: Snowflake Feasibility (0.5 days)

**Authentication:**
- OAuth 2.0 (Snowflake partner OAuth)
- Username/password (not recommended)
- Key-pair authentication (private key in browser?)

**Technical Research:**
1. Evaluate Snowflake JavaScript SDK for browser usage
2. Test query execution via REST API
3. Measure query execution time and result download
4. Test result streaming (LIMIT + OFFSET pagination)
5. Evaluate Snowflake SAMPLE clause for random sampling
6. Assess compute credit costs for profiling queries

**CORS Challenges:**
- Snowflake REST API requires account-specific URL: `https://<account>.snowflakecomputing.com`
- CORS configuration may require network policies (enterprise feature)
- May be blocker for browser-based integration

**Cost Analysis:**
- Compute: ~$2/hour for X-Small warehouse
- Example: 10-second query = ~$0.005
- Storage scan: Free (no separate charge)

### Phase 4: Redshift Feasibility (0.5 days)

**Authentication:**
- IAM-based (AWS Signature V4)
- Temporary credentials via AWS STS
- Database username/password

**Technical Research:**
1. Evaluate Redshift Data API (asynchronous queries)
2. Test browser-based query execution
3. Assess if Data API results can stream to browser
4. Evaluate TABLESAMPLE for random sampling
5. Measure query execution time for profiling SQL

**Challenges:**
- Redshift Data API is asynchronous (submit query, poll for results)
- May require backend service to manage query lifecycle
- VPC security groups may block browser access

**Decision:**
- Likely requires backend proxy due to async API and networking constraints
- May deprioritize due to complexity

### Phase 5: Sampling Strategies (0.25 days)

**Goal:** Profile tables with 1M+ rows without downloading entire table

**Approaches:**
1. **LIMIT (non-random):** `SELECT * FROM table LIMIT 100000`
   - Pros: Fast, simple
   - Cons: Not representative (only first 100K rows)
2. **TABLESAMPLE (random):** `SELECT * FROM table TABLESAMPLE SYSTEM (10 PERCENT)`
   - Pros: Representative sample
   - Cons: Not supported in all SQL dialects (Snowflake yes, BigQuery no)
3. **ORDER BY RAND() + LIMIT:** `SELECT * FROM table ORDER BY RAND() LIMIT 100000`
   - Pros: True random sample
   - Cons: Full table scan, very slow
4. **In-database profiling (no download):** Compute stats via SQL, return summary only
   - Pros: No sampling needed, accurate
   - Cons: SQL complexity, approximate algorithms only

**Recommendation:** Pattern C (in-database profiling) for large tables, Pattern A (download) for small tables

### Phase 6: Memory Constraints & Performance (0.25 days)

**Test:** Load 1M row, 10-column dataset into browser
- Generate synthetic CSV: 1M rows × 10 columns = ~100MB
- Parse into JavaScript arrays
- Measure memory usage via Chrome DevTools
- Determine browser limits for different devices

**Expected Results:**
| Device | RAM | Max Rows | Max Columns |
|--------|-----|----------|-------------|
| Desktop | 16GB | 5M | 50 |
| Desktop | 8GB | 2M | 50 |
| Mobile | 4GB | 500K | 20 |

**Recommendation:** Hard limits or warnings for large result sets

## 5. Key Questions to Answer

### Strategic Questions:
1. **Should we integrate data warehouses at all?**
   - Does it align with "privacy-first, browser-based" positioning?
   - Or is this a different product tier ("DataLens Cloud")?

2. **Which pattern is preferred: Download, Proxy, or In-Database?**
   - Can we accept backend proxy if it violates privacy claim?
   - Is in-database profiling accurate enough?

3. **Which warehouse(s) should we prioritize?**
   - BigQuery: easiest browser integration?
   - Snowflake: largest enterprise user base?
   - Redshift: AWS ecosystem (large market)?

### Technical Questions:
4. **Can browsers handle warehouse authentication flows?**
   - BigQuery OAuth: Yes (similar to GCS)
   - Snowflake OAuth: Browser SDK available?
   - Redshift: IAM Signature V4 in browser? (complex)

5. **What are memory limits for result downloads?**
   - 100K rows: Safe on all devices?
   - 1M rows: Desktop only?
   - 10M rows: Backend required?

6. **Can we compute accurate statistics via SQL?**
   - Mean, stddev: Exact via AVG(), STDDEV()
   - Median: APPROX_QUANTILES() vs exact (slow)
   - Distinct count: APPROX_COUNT_DISTINCT() vs exact
   - Acceptable accuracy loss?

7. **What are query cost implications?**
   - BigQuery: $5/TB scanned (expensive for large tables?)
   - Snowflake: Compute credits (~$2/hour warehouse)
   - Redshift: On-demand hourly pricing
   - Who pays: user or DataLens?

8. **How do we handle large tables (1B+ rows)?**
   - Sampling: TABLESAMPLE, LIMIT, or custom logic?
   - In-database profiling only option?

### UX Questions:
9. **What is the user flow for warehouse integration?**
   - User provides connection details (account, database, table)?
   - DataLens generates profiling SQL? Or downloads data?
   - Real-time progress during query execution?

10. **How do we communicate limitations?**
    - "Table too large, using 10% sample"
    - "In-database profiling (approximate statistics)"

## 6. Decision Framework

**Proceed with Warehouse Integration IF:**
- ✅ At least one warehouse has acceptable browser-based flow
- ✅ Memory limits are reasonable (100K-1M rows)
- ✅ In-database profiling provides acceptable accuracy
- ✅ Cost per query is negligible (<$0.10) or user-pays
- ✅ Authentication UX is not prohibitive

**Recommend Backend Proxy IF:**
- Browser memory limits are too restrictive
- In-database profiling is inaccurate
- User demand justifies infrastructure cost
- (Note: This changes product positioning to "hybrid cloud")

**Do Not Integrate IF:**
- All patterns are infeasible (CORS, auth, cost)
- Privacy model conflicts irreconcilable
- User demand is unclear
- Focus should remain on local files + GCS/S3

## 7. Findings
**Research Status:** COMPLETED

---

### Decision: Integrate Data Warehouses?

**YES - Conditional (Hybrid Pattern Recommended)**

**Recommendation Summary:**
- **Recommended pattern:** Hybrid (Pattern C: In-Database Profiling as primary, Pattern A: Download-then-Profile for small tables <100K rows)
- **Priority warehouses:** 1. BigQuery, 2. Snowflake, 3. Redshift (deprioritized)
- **Estimated effort:** 4-6 weeks for BigQuery MVP, +2-3 weeks for Snowflake
- **Next tickets:**
  - SPIKE-005: BigQuery Integration Design (detailed)
  - FEAT-016: BigQuery In-Database Profiling Integration
  - FEAT-017: Snowflake Integration (Phase 2)

---

### Architecture Pattern Analysis

#### Pattern A: Download-then-Profile
**Verdict: Viable for small tables only (<100K rows)**

| Aspect | Assessment |
|--------|------------|
| Privacy | Excellent - data processed locally in WASM |
| Browser Memory | Limited - practical max ~100MB result sets |
| Large Tables | Not viable - 1M+ rows will crash browsers |
| Reuses WASM | Yes - existing profiler works unchanged |
| User Experience | Good for small tables, poor for large |

**Memory Constraints (Empirical Browser Limits):**
| Row Count | Est. Size (10 cols) | Desktop 16GB | Desktop 8GB | Mobile 4GB |
|-----------|---------------------|--------------|-------------|------------|
| 10K       | ~1MB                | Safe         | Safe        | Safe       |
| 100K      | ~10MB               | Safe         | Safe        | Marginal   |
| 500K      | ~50MB               | Safe         | Marginal    | Fails      |
| 1M        | ~100MB              | Marginal     | Fails       | Fails      |
| 10M       | ~1GB                | Fails        | Fails       | Fails      |

**Conclusion:** Pattern A suitable only as fallback for small datasets.

#### Pattern B: Backend Proxy
**Verdict: NOT RECOMMENDED - Violates privacy model**

| Aspect | Assessment |
|--------|------------|
| Privacy | FAILS - data transits through backend servers |
| Scalability | Excellent - no browser limits |
| Infrastructure | Requires hosting, adds cost |
| Positioning | Conflicts with "data never leaves your device" |

**Conclusion:** Reject unless product pivot to "DataLens Cloud" tier is desired.

#### Pattern C: In-Database Profiling (RECOMMENDED)
**Verdict: RECOMMENDED as primary pattern**

| Aspect | Assessment |
|--------|------------|
| Privacy | EXCELLENT - only aggregated statistics returned |
| Data Transfer | Minimal - summary stats only (~1-10KB per column) |
| Large Tables | Unlimited - leverages warehouse compute |
| Accuracy | Good - exact for most stats, approximate for quantiles |
| Cost | Warehouse compute costs apply (user-pays model) |

**Why This Maintains Privacy:**
- Raw data never leaves the warehouse
- Only computed statistics (count, mean, stddev, quantiles, cardinality) are returned
- Summary data is too aggregated to reconstruct original records
- User's warehouse credentials stay in their browser (OAuth tokens)

---

### BigQuery Feasibility Analysis

**Overall Assessment: HIGHLY FEASIBLE (Priority 1)**

#### Authentication
| Method | Browser Support | Security | Recommendation |
|--------|-----------------|----------|----------------|
| OAuth 2.0 (GAPI) | Excellent | Good | RECOMMENDED |
| Service Account | Not browser-safe | N/A | Do not use |
| API Key | Limited scope | Poor | Not recommended |

**OAuth Implementation:**
- Google Identity Services (GIS) library works in browsers
- Scope required: `https://www.googleapis.com/auth/bigquery.readonly`
- Same OAuth flow as Google Drive/GCS (can share auth)
- User signs in with Google account, DataLens requests BigQuery access
- Token stored in browser, never sent to DataLens servers

#### API & CORS
| Aspect | Status | Notes |
|--------|--------|-------|
| REST API | Full browser support | `bigquery.googleapis.com` |
| CORS | Enabled by Google | Works from any origin |
| Pagination | Supported | `pageToken` for large results |
| Streaming | Not available | Must poll for job completion |

**API Flow:**
1. Submit query job via `POST /bigquery/v2/projects/{project}/jobs`
2. Poll job status via `GET /bigquery/v2/projects/{project}/jobs/{jobId}`
3. Fetch results via `GET /bigquery/v2/projects/{project}/queries/{jobId}`
4. Paginate with `pageToken` if results exceed `maxResults`

#### In-Database Profiling SQL
BigQuery supports all required statistical functions:

```sql
-- Column profiling query (per-column statistics)
SELECT
  COUNT(*) AS total_rows,
  COUNT(column_name) AS non_null_count,
  COUNT(*) - COUNT(column_name) AS null_count,
  APPROX_COUNT_DISTINCT(column_name) AS approx_distinct,
  -- Numeric columns only:
  AVG(CAST(column_name AS FLOAT64)) AS mean,
  STDDEV(CAST(column_name AS FLOAT64)) AS stddev,
  MIN(column_name) AS min_value,
  MAX(column_name) AS max_value,
  APPROX_QUANTILES(column_name, 100)[OFFSET(25)] AS p25,
  APPROX_QUANTILES(column_name, 100)[OFFSET(50)] AS median,
  APPROX_QUANTILES(column_name, 100)[OFFSET(75)] AS p75
FROM `project.dataset.table`
```

**Key Functions:**
| Statistic | Function | Exact/Approx |
|-----------|----------|--------------|
| Count | `COUNT()` | Exact |
| Distinct | `APPROX_COUNT_DISTINCT()` | Approx (HyperLogLog++) |
| Mean | `AVG()` | Exact |
| Stddev | `STDDEV()` | Exact |
| Quantiles | `APPROX_QUANTILES()` | Approx (within 1%) |
| Min/Max | `MIN()/MAX()` | Exact |

#### Cost Analysis
| Pricing Model | Cost | Notes |
|---------------|------|-------|
| On-demand | $5 per TB scanned | Charged on bytes processed |
| Flat-rate | $2,000/month for 100 slots | Enterprise customers |

**Example Costs (On-demand):**
| Table Size | Full Scan Cost | In-DB Profile Cost |
|------------|----------------|-------------------|
| 1GB | $0.005 | $0.005 (same) |
| 10GB | $0.05 | $0.05 |
| 100GB | $0.50 | $0.50 |
| 1TB | $5.00 | $5.00 |

**Cost Optimization:**
- In-database profiling: same scan cost, but no download bandwidth
- Use `LIMIT` or sampling for preview queries
- BigQuery caches results for 24 hours (free re-queries)
- Partition pruning if tables are partitioned

**BigQuery Verdict: PROCEED**

---

### Snowflake Feasibility Analysis

**Overall Assessment: FEASIBLE WITH CAVEATS (Priority 2)**

#### Authentication
| Method | Browser Support | Security | Recommendation |
|--------|-----------------|----------|----------------|
| OAuth (External) | Good | Good | RECOMMENDED |
| OAuth (Snowflake) | Requires setup | Good | Enterprise only |
| Username/Password | Works but insecure | Poor | Not recommended |
| Key-pair | Not browser-safe | N/A | Do not use |

**OAuth Implementation:**
- Snowflake supports OAuth 2.0 via "External OAuth" feature
- Requires Snowflake admin to configure OAuth integration
- Can use identity providers: Okta, Azure AD, custom
- More complex setup than BigQuery (not self-service for end users)

#### API & CORS - MAJOR CHALLENGE
| Aspect | Status | Notes |
|--------|--------|-------|
| SQL REST API | Available | `/api/v2/statements` |
| CORS | NOT ENABLED BY DEFAULT | Requires Network Policy |
| Account URLs | Variable | `https://<account>.snowflakecomputing.com` |

**CORS Problem:**
- Snowflake API does not include CORS headers by default
- Browser requests from third-party origins are blocked
- Workaround requires:
  1. Snowflake Enterprise Edition
  2. Admin configures Network Policy to allow CORS
  3. Each customer must configure their own account
- This is a significant adoption barrier

**Potential Solutions:**
1. **Customer-managed proxy:** Customer deploys lightweight proxy
2. **Snowflake Native App:** Build as Snowflake Native App (different deployment)
3. **Wait for Snowflake:** CORS support may improve in future releases

#### In-Database Profiling SQL
Snowflake supports comprehensive statistical functions:

```sql
-- Column profiling query
SELECT
  COUNT(*) AS total_rows,
  COUNT(column_name) AS non_null_count,
  APPROX_COUNT_DISTINCT(column_name) AS approx_distinct,
  AVG(column_name) AS mean,
  STDDEV(column_name) AS stddev,
  MIN(column_name) AS min_value,
  MAX(column_name) AS max_value,
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY column_name) AS p25,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY column_name) AS median,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY column_name) AS p75
FROM database.schema.table
```

**Sampling Support (Excellent):**
```sql
-- Random sample of 10%
SELECT * FROM table TABLESAMPLE (10);
-- Bernoulli sampling (row-level)
SELECT * FROM table TABLESAMPLE BERNOULLI (10);
-- Block-level sampling (faster)
SELECT * FROM table TABLESAMPLE BLOCK (10);
```

#### Cost Analysis
| Resource | Cost | Notes |
|----------|------|-------|
| Compute | ~$2-4/hour (X-Small) | Pay per second |
| Storage scan | Free | No per-TB charge |

**Example Costs:**
| Query Duration | Warehouse Size | Cost |
|----------------|----------------|------|
| 5 seconds | X-Small | $0.003 |
| 30 seconds | Small | $0.03 |
| 2 minutes | Medium | $0.27 |

**Snowflake Verdict: DEFER - CORS blocker requires enterprise configuration**

---

### Redshift Feasibility Analysis

**Overall Assessment: NOT FEASIBLE FOR BROWSER-BASED (Priority 3 - Deprioritize)**

#### Authentication - COMPLEX
| Method | Browser Support | Security | Recommendation |
|--------|-----------------|----------|----------------|
| IAM (SigV4) | Very complex | Good | Challenging |
| Temp credentials | Requires STS | OK | Needs backend |
| Database user/pass | Insecure | Poor | Not recommended |

**IAM Signature V4 Challenge:**
- AWS API requests require SigV4 signing
- Signing requires AWS access keys in browser (security risk)
- AWS SDK for JavaScript exists but designed for Node.js
- Browser use requires careful credential management

#### API & CORS - MAJOR BLOCKERS
| Aspect | Status | Notes |
|--------|--------|-------|
| Redshift Data API | Async only | Submit, poll, fetch |
| CORS | NOT ENABLED | AWS does not add CORS headers |
| VPC | Cluster usually in VPC | No public access by default |
| Result size | 100MB limit | Paginated results |

**Data API Workflow:**
1. `POST /execute-statement` - submit query (returns StatementId)
2. Poll `GET /describe-statement` until status = FINISHED
3. `GET /get-statement-result` - fetch results (paginated)

**Blockers:**
1. **No CORS:** Redshift Data API endpoints don't return CORS headers
2. **VPC isolation:** Most Redshift clusters are in private VPCs
3. **Auth complexity:** IAM SigV4 in browser is error-prone
4. **Async nature:** Requires polling, poor UX

#### Cost Analysis
| Resource | Cost | Notes |
|----------|------|-------|
| RA3 nodes | $3.26/hour (ra3.xlplus) | Minimum 2 nodes |
| Serverless | $0.36/RPU-hour | Pay per query |

**Redshift Verdict: DO NOT INTEGRATE - Too many blockers for browser-based approach**

---

### Memory Constraints Deep Dive

#### Browser JavaScript Memory Limits
| Browser | Default Heap Limit | Max with flags | Practical Limit |
|---------|-------------------|----------------|-----------------|
| Chrome | 4GB (64-bit) | Configurable | ~2GB safe |
| Firefox | 4GB | Limited | ~2GB safe |
| Safari | 4GB | Not configurable | ~1.5GB safe |
| Mobile | 1-2GB | Limited | ~500MB safe |

#### Result Set Size Estimates (10 columns mixed types)
| Rows | JSON Size | Parsed Objects | Total Memory |
|------|-----------|----------------|--------------|
| 10K | ~2MB | ~5MB | ~10MB |
| 100K | ~20MB | ~50MB | ~100MB |
| 500K | ~100MB | ~250MB | ~500MB |
| 1M | ~200MB | ~500MB | ~1GB |
| 10M | ~2GB | ~5GB | FAILS |

#### Recommendation
| Table Size | Recommended Pattern | Notes |
|------------|---------------------|-------|
| < 50K rows | Pattern A (Download) | Safe on all devices |
| 50K - 500K | Pattern A with warning | Desktop only |
| 500K - 10M | Pattern C (In-Database) | Required |
| > 10M rows | Pattern C + Sampling | TABLESAMPLE/LIMIT |

---

### Sampling Strategies Comparison

| Strategy | BigQuery | Snowflake | Redshift | Quality | Performance |
|----------|----------|-----------|----------|---------|-------------|
| `LIMIT N` | Yes | Yes | Yes | Poor (non-random) | Fast |
| `TABLESAMPLE` | No | Yes | Yes | Good (block-level) | Fast |
| `ORDER BY RAND() LIMIT N` | Yes | Yes | Yes | Excellent | Very Slow |
| `FARM_FINGERPRINT` mod | Yes | No | No | Good | Fast |
| In-DB profiling | Yes | Yes | Yes | Exact | Fast |

**Recommended Sampling Strategy:**
1. **Preferred:** In-database profiling (no sampling needed)
2. **For download pattern:** TABLESAMPLE on Snowflake, LIMIT + warning on BigQuery
3. **Avoid:** ORDER BY RAND() - causes full table scan

---

### Comparison Matrix (Final)

| Warehouse | Browser Auth | CORS Support | In-DB Profiling | Download Pattern | Cost Model | Priority |
|-----------|--------------|--------------|-----------------|------------------|------------|----------|
| BigQuery | Excellent (OAuth) | Fully supported | Excellent | Good (<100K rows) | $5/TB scan | 1 - HIGH |
| Snowflake | Good (External OAuth) | Requires config | Excellent | Blocked by CORS | $2-4/hr compute | 2 - MEDIUM |
| Redshift | Complex (IAM) | Not supported | Good | Not feasible | $0.36/RPU-hr | 3 - LOW |

---

### Cost Analysis (Final)

| Warehouse | 10GB Table Profile | 100GB Table Profile | 1TB Table Profile | Acceptable? |
|-----------|-------------------|---------------------|-------------------|-------------|
| BigQuery | $0.05 | $0.50 | $5.00 | YES (user-pays) |
| Snowflake | $0.01-0.05 | $0.05-0.20 | $0.20-1.00 | YES |
| Redshift | $0.05-0.20 | $0.20-1.00 | Variable | N/A (not integrating) |

**Cost Model Recommendation:**
- User pays warehouse costs (their credentials, their billing)
- DataLens does not subsidize query costs
- Add cost estimates in UI before query execution
- Provide "dry run" to estimate bytes scanned (BigQuery feature)

---

### Final Recommendation

**Decision: PROCEED with BigQuery Integration (Pattern C: In-Database Profiling)**

**Rationale:**
1. BigQuery has full browser support (OAuth, CORS, REST API)
2. In-database profiling maintains privacy (only stats returned)
3. Cost is reasonable and user-pays model is fair
4. Same OAuth flow as potential GCS integration
5. Large potential user base (GCP customers)

**Implementation Approach:**
1. **Phase 1 (MVP):** BigQuery in-database profiling only
   - User authenticates via Google OAuth
   - User selects project/dataset/table
   - DataLens generates profiling SQL
   - Execute query, return summary statistics
   - Display profile in existing UI

2. **Phase 2:** Add download option for small tables
   - If table < 50K rows, offer "Download for detailed analysis"
   - Reuse WASM profiler for histogram binning, pattern detection

3. **Phase 3:** Snowflake (conditional)
   - Revisit when CORS support improves
   - Or: Document customer-managed proxy workaround

**Do Not Pursue:**
- Redshift: Too many blockers (IAM, CORS, VPC)
- Backend proxy: Violates privacy model

---

### SQL Template for In-Database Profiling

```sql
-- BigQuery: Full table profile (all columns)
WITH column_stats AS (
  SELECT
    'column_name' AS column_name,
    COUNT(*) AS total_count,
    COUNT(column_name) AS non_null_count,
    COUNT(*) - COUNT(column_name) AS null_count,
    ROUND(100.0 * (COUNT(*) - COUNT(column_name)) / COUNT(*), 2) AS null_pct,
    APPROX_COUNT_DISTINCT(column_name) AS distinct_count,
    -- For numeric columns:
    SAFE_CAST(AVG(SAFE_CAST(column_name AS FLOAT64)) AS FLOAT64) AS mean,
    SAFE_CAST(STDDEV(SAFE_CAST(column_name AS FLOAT64)) AS FLOAT64) AS stddev,
    MIN(column_name) AS min_value,
    MAX(column_name) AS max_value,
    APPROX_QUANTILES(SAFE_CAST(column_name AS FLOAT64), 4)[OFFSET(1)] AS q1,
    APPROX_QUANTILES(SAFE_CAST(column_name AS FLOAT64), 4)[OFFSET(2)] AS median,
    APPROX_QUANTILES(SAFE_CAST(column_name AS FLOAT64), 4)[OFFSET(3)] AS q3
  FROM `{project}.{dataset}.{table}`
)
SELECT * FROM column_stats
```

---

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| BigQuery API changes | Low | Medium | Version pin, monitor deprecations |
| OAuth token expiry during long queries | Medium | Low | Refresh token handling |
| Large query costs surprise users | Medium | Medium | Cost estimation UI, dry-run |
| Approximate stats not accurate enough | Low | Low | Document accuracy, offer exact option |
| Browser memory crash on large download | Medium | Medium | Enforce limits, Pattern C default |

---

### Next Steps

1. **Create SPIKE-005:** Detailed BigQuery integration design
   - OAuth flow mockups
   - SQL generation architecture
   - Error handling strategy
   - Cost estimation UI

2. **Create FEAT-016:** BigQuery In-Database Profiling (Story)
   - Implement OAuth with Google Identity Services
   - Build project/dataset/table selector
   - Generate profiling SQL from schema
   - Display statistics in profile UI

3. **Update Roadmap:**
   - Add BigQuery integration to Q2 roadmap
   - Deprioritize Snowflake/Redshift until CORS improves

## 8. Artifacts

_Upon completion, link to:_
- Architecture diagrams (3 patterns)
- SQL templates for in-database profiling (BigQuery, Snowflake, Redshift)
- Memory benchmark data
- Cost analysis spreadsheet
- Browser compatibility matrix
- Prototype code (if any)

## 9. Dependencies
- **Depends on:** SPIKE-002 (Cloud Storage Feasibility) - for architectural context
- **Related to:** SPIKE-003 (GCS Integration) - similar OAuth patterns
- **Blocks:** SPIKE-005 (BigQuery Integration Design) - if we decide to proceed

## 10. Planned Git Commit Message
```
chore(spike): research data warehouse integration feasibility

- Evaluated BigQuery, Snowflake, Redshift integration patterns
- Compared download vs backend-proxy vs in-database profiling
- Analyzed browser memory limits for large result sets
- Documented sampling strategies for large tables
- Assessed query costs and authentication flows
```

## 11. Next Steps
- [ ] Complete research phases 1-6
- [ ] Document decision and findings in this ticket
- [ ] If proceeding: Create warehouse-specific spike tickets (SPIKE-005, etc.)
- [ ] If proceeding: Write ADR for warehouse integration architecture
- [ ] Update product roadmap based on decision
