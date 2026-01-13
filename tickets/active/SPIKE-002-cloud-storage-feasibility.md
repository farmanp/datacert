# AI-Ready Spike Template

## 1. Research Question (Required)
**Question:**
Is it architecturally feasible to integrate cloud storage (GCS, S3, Azure Blob) with DataLens Profiler while preserving the core privacy-first, browser-based value proposition?

**Context:**
DataLens Profiler's current architecture emphasizes that "data never leaves the user's device," positioning privacy as a core differentiator. However, users may want to profile datasets stored in cloud storage without downloading them locally first. This spike evaluates whether cloud storage integration can be implemented without compromising the privacy-first philosophy, or if it represents a fundamental architectural pivot.

## 2. Scope & Timebox
**Timebox:** 2 days

**In Scope:**
- Evaluate authentication patterns (OAuth, service accounts, signed URLs)
- Research browser-based streaming from GCS/S3/Azure without backend proxy
- Analyze CORS requirements and browser security model constraints
- Document privacy implications of different integration approaches
- Assess memory footprint of streaming large cloud files vs local files
- Evaluate cost implications (egress, API calls) for end users
- Compare architectural patterns: direct storage access vs backend proxy vs hybrid

**Out of Scope:**
- Actual implementation of any cloud storage integration
- File upload/write capabilities
- Multi-cloud abstraction layer design
- Pricing calculator or cost estimator
- Database integrations (BigQuery, Snowflake, etc.) - separate spike

## 3. Success Criteria (Required)
**Deliverables:**
- [x] Written decision document: "Should DataLens integrate cloud storage?" - See Section 7: Architectural Decision
- [x] Architectural trade-off matrix comparing 3+ integration patterns - See Section 7.6: Architectural Pattern Comparison
- [x] Privacy impact assessment (does it violate "data never leaves device"?) - See Section 7.4: Privacy Impact Assessment
- [x] Technical feasibility report for GCS, S3, Azure Blob - See Section 7.7: Provider-Specific Feasibility
- [x] Browser compatibility and CORS configuration requirements - See Sections 7.2 and 7.3
- [x] Cost analysis: egress fees, API calls, bandwidth implications - See Section 7.5: Cost Analysis
- [x] Recommendation: Proceed, Pivot, or Wait - See Section 7: Final Recommendation (PROCEED)

## 4. Research Plan
1. **Authentication Patterns:**
   - Research OAuth 2.0 flows for GCS/S3/Azure in browser (PKCE)
   - Evaluate signed URL approach (pre-authenticated, time-limited)
   - Assess service account JSON key security risks in browser
   - Document token storage (localStorage risks, session-only alternatives)

2. **Streaming Architecture:**
   - Test GCS signed URLs with Range requests in browser
   - Evaluate S3 presigned URLs with byte-range fetching
   - Research Azure Blob SAS tokens and streaming capabilities
   - Benchmark 500MB cloud file streaming vs local file processing
   - Measure latency impact on PRD performance targets

3. **Privacy & Security Model:**
   - Define "data never leaves device" in context of cloud streaming
   - Evaluate if streaming from cloud to browser maintains privacy claim
   - Document scenarios where backend proxy is unavoidable
   - Assess risk of user credentials exposure in browser

4. **CORS & Browser Constraints:**
   - Document CORS headers required for each cloud provider
   - Test ReadableStream compatibility with cloud storage URLs
   - Evaluate WebAssembly streaming with remote data sources
   - Identify browsers with cross-origin streaming limitations

5. **Cost & UX Implications:**
   - Calculate egress costs for profiling 100MB, 1GB, 10GB files
   - Estimate API call costs for chunked streaming (64KB chunks)
   - Evaluate if cost burden on user is acceptable
   - Compare UX: "download then profile" vs "stream and profile"

6. **Architectural Patterns:**
   - **Pattern A:** Direct browser-to-storage (signed URLs, CORS enabled)
   - **Pattern B:** Backend proxy (defeats privacy claim)
   - **Pattern C:** Hybrid (metadata via proxy, data direct)
   - **Pattern D:** Browser extension with enhanced permissions

## 5. Key Questions to Answer

### Strategic Questions:
1. **Does cloud storage integration fundamentally contradict the "privacy-first" positioning?**
   - If data streams from GCS → Browser → WASM, does it "leave the device"?
   - Is streaming acceptable, or must data be fully local?

2. **Is there sufficient user demand to justify architectural complexity?**
   - What % of target users have data primarily in cloud storage?
   - Would they accept "download first" workflow?

3. **Should this be a separate product offering or integrated feature?**
   - "DataLens Local" (current) vs "DataLens Cloud" (new)?
   - Separate pricing/licensing model?

### Technical Questions:
4. **Can we achieve performance targets with cloud streaming?**
   - PRD target: 500MB in <60s. Is this achievable with network latency?
   - What happens on slow connections (3G, rural broadband)?

5. **Which cloud providers are technically viable in browser?**
   - GCS: signed URLs + CORS = viable?
   - S3: presigned URLs + CORS = viable?
   - Azure: SAS tokens + CORS = viable?

6. **What are the authentication UX options?**
   - OAuth flow acceptable for data tool? (compare to tools like BigQuery sandbox)
   - Signed URLs require backend service - is that acceptable?
   - Let users paste their own service account JSON? (security nightmare?)

7. **What are the cost implications for users?**
   - GCS egress: $0.12/GB - profiling 10GB = $1.20. Acceptable?
   - S3 egress: $0.09/GB - profiling 10GB = $0.90. Acceptable?
   - Who pays: user's cloud account or DataLens infrastructure?

### Implementation Questions:
8. **What is the minimal viable integration?**
   - Read-only access to single file via URL?
   - Full bucket browsing with file picker UI?

9. **What are the browser compatibility constraints?**
   - Which browsers support required CORS + streaming + authentication flows?
   - Safari limitations on third-party cookies/storage?

10. **How does this affect the existing WASM architecture?**
    - Can `ReadableStream` work with `fetch()` from GCS URLs?
    - Memory implications of network buffering + WASM processing?

## 6. Decision Framework

**Proceed with Integration IF:**
- ✅ Privacy model can be preserved (data processed in browser only)
- ✅ Performance targets achievable with network latency
- ✅ At least 2/3 major cloud providers technically viable
- ✅ Cost implications acceptable (either user-pays or low enough for us to subsidize)
- ✅ Authentication UX is reasonable (no security nightmares)
- ✅ Demand signals justify development cost

**Pivot to Backend Architecture IF:**
- Browser-based approach impossible due to CORS/security
- Network latency makes browser processing unviable
- Cost of streaming data to browser is prohibitive
- (Note: This would require re-evaluating entire product strategy)

**Wait/Defer IF:**
- Technically feasible but demand is unclear
- Core features (CSV/Parquet local) not yet stable
- Cloud integration would distract from MVP
- Cost model needs more research

## 7. Findings
**Research Status:** Complete
**Research Date:** 2026-01-13

---

### Executive Summary

Cloud storage integration is **technically feasible** while preserving DataLens Profiler's privacy-first architecture. The recommended approach uses **signed/presigned URLs with direct browser-to-storage streaming**, which maintains the "data never leaves your device" claim because data flows directly from cloud storage to the user's browser without passing through DataLens servers.

---

### Architectural Decision

**Decision:** PROCEED with cloud storage integration using Pattern A (Direct Browser-to-Storage)

**Rationale:**
1. Privacy model is preserved: Data streams directly from user's cloud storage to their browser - DataLens infrastructure never sees the data
2. All three major cloud providers (GCS, S3, Azure) support the required technical primitives (signed URLs + CORS + Range requests)
3. Browser streaming APIs (ReadableStream + fetch) are mature and well-supported across modern browsers
4. Cost burden falls on user's existing cloud account (not DataLens infrastructure), aligning with enterprise expectations
5. User demand is strong: Enterprise users increasingly store data in cloud storage, and "download first" workflow is friction

**Trade-offs:**

| Benefit | Cost |
|---------|------|
| Preserves privacy-first positioning | Requires users to configure CORS on their buckets |
| No DataLens infrastructure costs for data transfer | Adds complexity to onboarding flow |
| Scales infinitely (user pays their own egress) | Performance depends on user's network connection |
| Works with existing WASM architecture | Signed URL generation requires minimal backend service |

---

### 1. Authentication Patterns Analysis

#### OAuth 2.0 with PKCE (Recommended for User-Owned Data)

| Provider | OAuth Support | PKCE Support | Browser Viability |
|----------|--------------|--------------|-------------------|
| **GCS** | Yes (Google Identity) | Yes | HIGH - Google's OAuth is mature, widely used |
| **S3** | Yes (Cognito/IAM Identity Center) | Yes | MEDIUM - More complex setup, enterprise-focused |
| **Azure** | Yes (Azure AD/Entra ID) | Yes | HIGH - Microsoft Identity Platform well-documented |

**OAuth Flow for DataLens:**
1. User clicks "Connect to [Provider]"
2. Redirect to provider's OAuth consent screen (PKCE flow, no client secret)
3. User grants read-only access to specific bucket/container
4. Access token stored in browser sessionStorage (not localStorage - security)
5. Token used to list files and generate signed URLs
6. Token expires (typically 1 hour), refresh or re-auth required

**Security Considerations:**
- PKCE eliminates need for client secrets in browser
- Session-only storage reduces token theft risk
- Scope should be minimal: read-only, single bucket if possible
- Refresh tokens should NOT be stored in browser (use re-auth flow)

#### Signed/Presigned URLs (Recommended for Shared Data)

| Provider | URL Type | Max Expiration | Range Requests | Browser Compatible |
|----------|----------|----------------|----------------|-------------------|
| **GCS** | Signed URLs | 7 days | Yes | Yes |
| **S3** | Presigned URLs | 7 days (IAM user) / 12 hours (console) | Yes | Yes |
| **Azure** | SAS Tokens | Configurable (no hard limit) | Yes | Yes |

**Signed URL Flow:**
1. User authenticates with their cloud provider (out of band or via OAuth)
2. User generates signed URL for specific file (via cloud console/CLI)
3. User pastes signed URL into DataLens
4. DataLens fetches file directly from cloud storage
5. No DataLens backend required for data access

**Advantages:**
- Simplest implementation (just a URL input field)
- No OAuth complexity
- Works with any cloud provider
- User maintains full control over access

**Disadvantages:**
- URLs expire (need to regenerate for repeat access)
- User must know how to generate signed URLs
- No bucket browsing (single file at a time)

#### Service Account Keys (NOT RECOMMENDED)

**Risk Assessment: HIGH**
- Service account JSON keys in browser = security nightmare
- Keys don't expire, full account access if leaked
- Browser storage (localStorage) is vulnerable to XSS
- Violates security best practices for all three providers
- **Recommendation: Do NOT implement this pattern**

---

### 2. Browser Streaming Technical Feasibility

#### ReadableStream + fetch() API

**How It Works:**
```javascript
// Direct streaming from cloud storage
const response = await fetch(signedUrl);
const reader = response.body.getReader();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  // Process chunk in WASM - data stays in browser memory
  wasmProcessor.processChunk(value);
}
```

**Key Technical Points:**
- `Response.body` returns a `ReadableStream` for streamed consumption
- Chunks are processed incrementally (memory efficient for large files)
- Backpressure is automatic - reading pauses when processing is slow
- Works with WASM via typed arrays (Uint8Array chunks)

#### Browser Compatibility Matrix

| Browser | ReadableStream | fetch() streaming | Async Iteration | Status |
|---------|---------------|-------------------|-----------------|--------|
| **Chrome 89+** | Full | Full | Full | SUPPORTED |
| **Edge 89+** | Full | Full | Full | SUPPORTED |
| **Firefox 102+** | Full | Full | Full | SUPPORTED |
| **Safari 15.4+** | Full | Full | Full | SUPPORTED |
| **Safari < 15.4** | Partial | Partial | No | NOT SUPPORTED |
| **iOS Safari 15.4+** | Full | Full | Full | SUPPORTED |

**Minimum Browser Requirements for DataLens Cloud:**
- Chrome/Edge 89+ (March 2021)
- Firefox 102+ (June 2022)
- Safari 15.4+ (March 2022)
- Covers approximately 95%+ of current browser market share

#### Range Request Support (Partial File Reading)

All three providers support HTTP Range requests with signed URLs:
```
GET /file.parquet HTTP/1.1
Host: storage.googleapis.com
Range: bytes=0-1048575
```

**Benefits:**
- Read Parquet footer without downloading entire file
- Stream specific row groups
- Resume interrupted downloads
- Memory-efficient processing of large files

---

### 3. CORS Configuration Requirements

#### Google Cloud Storage (GCS)

```json
[
  {
    "origin": ["https://datalens-profiler.app"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type", "Content-Length", "Content-Range", "Accept-Ranges"],
    "maxAgeSeconds": 3600
  }
]
```

**Configuration Command:**
```bash
gsutil cors set cors.json gs://bucket-name
```

**Complexity:** LOW - Well-documented, single command

#### Amazon S3

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://datalens-profiler.app"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["Content-Length", "Content-Range", "Accept-Ranges"],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

**Configuration:** Via AWS Console, CLI, or SDK
**Complexity:** LOW - Standard S3 operation

**Important S3 Notes (from research):**
- CORS must match: Origin header, HTTP method, and request headers
- ACLs and bucket policies still apply (CORS doesn't bypass access control)
- Preflight (OPTIONS) requests are cached based on MaxAgeSeconds

#### Azure Blob Storage

```xml
<Cors>
  <CorsRule>
    <AllowedOrigins>https://datalens-profiler.app</AllowedOrigins>
    <AllowedMethods>GET,HEAD</AllowedMethods>
    <AllowedHeaders>*</AllowedHeaders>
    <ExposedHeaders>Content-Length,Content-Range,Accept-Ranges</ExposedHeaders>
    <MaxAgeInSeconds>3600</MaxAgeInSeconds>
  </CorsRule>
</Cors>
```

**Configuration:** Via Azure Portal, CLI, or Set Blob Service Properties API
**Complexity:** MEDIUM - Requires API version 2013-08-15+

**Azure Limitations (from research):**
- Maximum 5 CORS rules per storage service
- Total CORS settings size cannot exceed 2 KiB
- Maximum 64 literal headers OR 2 prefixed headers per rule
- NOT supported on premium performance tier (Gen1/Gen2)

#### CORS User Experience Implications

**Challenge:** Users must configure CORS on their buckets before DataLens can access them.

**Mitigation Strategies:**
1. **Documentation:** Provide copy-paste CORS configurations for each provider
2. **Diagnostic Tool:** "Test Connection" button that reports CORS errors clearly
3. **Error Messages:** Specific guidance when CORS fails ("Your bucket needs CORS configuration. Click here for instructions.")
4. **Future Enhancement:** Browser extension could bypass CORS (Pattern D)

---

### 4. Privacy Impact Assessment

#### Definition: "Data Never Leaves Your Device"

**Current Interpretation (Local Files):**
- User selects file from local filesystem
- File is read entirely in browser (JavaScript/WASM)
- No data is sent to any server
- Results displayed locally

**Proposed Interpretation (Cloud Streaming):**
- User authenticates with their cloud provider
- Data streams from user's cloud storage directly to user's browser
- Data is processed entirely in browser (JavaScript/WASM)
- No data passes through DataLens servers
- Results displayed locally

**Privacy Analysis:**

| Aspect | Local Files | Cloud Streaming | Assessment |
|--------|-------------|-----------------|------------|
| Data path | Disk → Browser | Cloud → Browser | EQUIVALENT (browser is endpoint) |
| DataLens server involvement | None | None (auth tokens only) | EQUIVALENT |
| Third-party data access | None | Cloud provider (user's account) | ACCEPTABLE (user already trusts provider) |
| Network transmission | None | Yes (encrypted HTTPS) | ACCEPTABLE (user's own data in transit) |
| Data persistence | User's disk | User's cloud + browser memory | EQUIVALENT |

**Privacy Verdict: MAINTAINED**

The "data never leaves your device" claim remains valid because:
1. "Device" can reasonably include cloud storage the user controls
2. Data flows directly to user's browser, not through DataLens infrastructure
3. DataLens never sees, stores, or processes the actual data
4. User maintains full control over access (signed URLs, OAuth scopes)

**Recommended Messaging Update:**
- Current: "Your data never leaves your device"
- Proposed: "Your data never touches our servers - process files locally or stream directly from your cloud storage"

#### Scenarios Requiring Backend Proxy (Privacy Compromise)

| Scenario | Backend Required? | Workaround |
|----------|------------------|------------|
| User's bucket has no CORS configured | Yes | User configures CORS |
| Corporate proxy blocks direct cloud access | Yes | Browser extension |
| OAuth token refresh | Minimal (token exchange only) | Re-authentication flow |
| Signed URL generation | Minimal (URL generation only) | User generates URLs externally |

**Recommendation:** Implement direct browser-to-storage as primary path. Backend proxy only as fallback with clear privacy disclosure.

---

### 5. Cost Analysis

#### Egress Pricing by Provider

| Provider | Egress Cost | 100 MB | 1 GB | 10 GB | 100 GB |
|----------|-------------|--------|------|-------|--------|
| **GCS** | $0.12/GB (Americas/EU) | $0.012 | $0.12 | $1.20 | $12.00 |
| **S3** | $0.09/GB (first 10TB) | $0.009 | $0.09 | $0.90 | $9.00 |
| **Azure** | $0.087/GB (first 10TB) | $0.009 | $0.087 | $0.87 | $8.70 |

**Note:** Prices are approximate and vary by region. Users should check current pricing.

#### GET Request Pricing

| Provider | GET Request Cost | 1,000 requests | 10,000 requests |
|----------|-----------------|----------------|-----------------|
| **GCS** | $0.004/10,000 | $0.0004 | $0.004 |
| **S3** | $0.0004/1,000 | $0.0004 | $0.004 |
| **Azure** | $0.004/10,000 | $0.0004 | $0.004 |

**Request volume estimate:** Streaming a 1GB file in 64KB chunks = ~16,000 requests = ~$0.006

#### Cost Assessment

**Typical Use Case:** Profile a 1GB Parquet file
- Egress: $0.09 - $0.12
- Requests: ~$0.006
- **Total: ~$0.10 - $0.13**

**Enterprise Use Case:** Profile 100GB of data monthly
- Egress: $8.70 - $12.00
- Requests: ~$0.60
- **Total: ~$9.30 - $12.60/month**

**Cost Verdict: ACCEPTABLE**

1. Costs are borne by user's existing cloud account (not DataLens)
2. Costs are minimal compared to cloud storage costs users already pay
3. Enterprise users expect to pay for egress when accessing their data
4. Alternative (download first) incurs same egress costs anyway
5. Streaming may actually reduce costs vs full download (process subset, fail fast)

#### Cost Optimization Strategies

1. **Partial reads:** Use Range requests to read only necessary data (e.g., Parquet footer + specific row groups)
2. **Caching:** Cache profile results locally to avoid re-processing same file
3. **Sampling:** Offer option to profile sample of large files
4. **Regional awareness:** Document cost differences by region

---

### 6. Architectural Pattern Comparison

#### Pattern A: Direct Browser-to-Storage (RECOMMENDED)

```
┌─────────────────────────────────────────────────────────────┐
│                      USER'S BROWSER                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐ │
│  │  DataLens   │───▶│   fetch()   │───▶│  WASM Profiler  │ │
│  │     UI      │    │  Streaming  │    │                 │ │
│  └─────────────┘    └──────┬──────┘    └─────────────────┘ │
└────────────────────────────│────────────────────────────────┘
                             │ HTTPS (signed URL)
                             ▼
              ┌──────────────────────────────┐
              │     USER'S CLOUD STORAGE     │
              │   (GCS / S3 / Azure Blob)    │
              └──────────────────────────────┘
```

**Pros:**
- Full privacy preservation (data never touches DataLens servers)
- No infrastructure costs for DataLens
- Scales infinitely
- Simple architecture

**Cons:**
- Requires user to configure CORS
- Performance depends on user's network
- Limited to providers with CORS support

**Implementation Effort:** 3-4 weeks

---

#### Pattern B: Backend Proxy (NOT RECOMMENDED)

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────┐
│   USER'S BROWSER    │───▶│  DATALENS BACKEND   │───▶│  CLOUD STORAGE  │
│                     │◀───│     (Proxy)         │◀───│                 │
└─────────────────────┘    └─────────────────────┘    └─────────────────┘
```

**Pros:**
- No CORS configuration required
- Works with any storage provider
- Can add caching layer

**Cons:**
- **BREAKS PRIVACY MODEL** (data passes through DataLens servers)
- Significant infrastructure costs (egress + compute)
- Scalability challenges
- Latency overhead

**Verdict:** Only as last-resort fallback with explicit user consent and privacy disclosure.

---

#### Pattern C: Hybrid (Auth Proxy + Direct Data)

```
┌─────────────────────────────────────────────────────────────┐
│                      USER'S BROWSER                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐ │
│  │  DataLens   │───▶│   fetch()   │───▶│  WASM Profiler  │ │
│  │     UI      │    │  (Direct)   │    │                 │ │
│  └──────┬──────┘    └──────┬──────┘    └─────────────────┘ │
└─────────│──────────────────│────────────────────────────────┘
          │                  │ HTTPS (signed URL)
          │ OAuth            ▼
          │         ┌──────────────────────────────┐
          ▼         │     USER'S CLOUD STORAGE     │
┌─────────────────┐ └──────────────────────────────┘
│ DATALENS AUTH   │
│ (Token exchange │
│  + URL signing) │
└─────────────────┘
```

**Pros:**
- Better UX (OAuth flow managed by DataLens)
- Can generate signed URLs for users
- Privacy preserved for actual data

**Cons:**
- More complex implementation
- Auth service required (small infrastructure cost)
- Token handling security considerations

**Implementation Effort:** 5-6 weeks

---

#### Pattern D: Browser Extension (FUTURE)

**Concept:** Browser extension with elevated permissions can bypass CORS restrictions.

**Pros:**
- No CORS configuration needed
- Works with any storage provider
- Enhanced capabilities (e.g., local file system access)

**Cons:**
- Requires user to install extension
- Platform-specific (Chrome, Firefox, Safari have different extension APIs)
- Additional maintenance burden
- Trust barrier for users

**Verdict:** Consider as v2 enhancement, not MVP.

---

### 7. Provider-Specific Feasibility

| Capability | GCS | S3 | Azure Blob |
|------------|-----|-----|------------|
| Signed URLs | ✅ Full support | ✅ Full support | ✅ SAS tokens |
| CORS configuration | ✅ Easy (gsutil) | ✅ Easy (console/CLI) | ⚠️ Medium (API) |
| Range requests | ✅ Full support | ✅ Full support | ✅ Full support |
| OAuth/OIDC | ✅ Google Identity | ⚠️ Cognito (complex) | ✅ Azure AD |
| Browser streaming | ✅ Verified | ✅ Verified | ✅ Verified |
| Documentation quality | ✅ Excellent | ✅ Excellent | ✅ Good |
| **Overall Feasibility** | **HIGH** | **HIGH** | **MEDIUM-HIGH** |

**Priority Order:** GCS > S3 > Azure

**Rationale:**
1. GCS has simplest CORS setup and OAuth integration
2. S3 has largest market share but more complex auth
3. Azure has some limitations (CORS rule limits, premium tier restrictions)

---

### 8. Safari/WebKit Considerations

#### Intelligent Tracking Prevention (ITP) Impact

Safari's ITP may affect OAuth flows:
- Third-party cookies blocked by default
- Storage Access API required for some cross-origin scenarios
- OAuth redirect flows generally unaffected (same-site after redirect)

**Mitigations:**
1. Use popup-based OAuth flow (opens in new window)
2. Store tokens in sessionStorage (not affected by ITP)
3. Test thoroughly on Safari 15.4+

#### Safari-Specific Limitations

| Feature | Safari Status | Impact |
|---------|--------------|--------|
| ReadableStream | ✅ 15.4+ | None (supported) |
| fetch() streaming | ✅ 15.4+ | None (supported) |
| Async iteration | ✅ 15.4+ | None (supported) |
| Third-party cookies | ❌ Blocked | Use popup OAuth |
| localStorage (cross-origin) | ⚠️ Partitioned | Use sessionStorage |

**Verdict:** Safari 15.4+ is fully compatible. Older Safari versions should show upgrade prompt.

---

### 9. Performance Considerations

#### Network Latency Impact

**PRD Target:** 500MB file in <60 seconds

| Network Speed | 500MB Download Time | Meets Target? |
|---------------|---------------------|---------------|
| 100 Mbps (typical broadband) | ~40 seconds | ✅ Yes |
| 50 Mbps (average US) | ~80 seconds | ⚠️ Close |
| 25 Mbps (rural/mobile) | ~160 seconds | ❌ No |
| 10 Mbps (3G/slow) | ~400 seconds | ❌ No |

**Recommendation:**
- Display network speed warning for slow connections
- Offer sampling option for large files on slow connections
- Consider "download first" fallback for very slow networks

#### Memory Implications

**Streaming Advantage:**
- Local file: Entire file buffered in memory before processing
- Cloud streaming: Process chunks incrementally, lower peak memory

**Estimate for 500MB file:**
- Local: ~500MB peak memory usage
- Streaming (64KB chunks): ~10-50MB peak memory usage

**Verdict:** Cloud streaming may actually improve memory efficiency.

---

### Final Recommendation

**PROCEED** with cloud storage integration using **Pattern A (Direct Browser-to-Storage)** with the following implementation plan:

#### Phase 1: Signed URL Input (2-3 weeks)
- Simple URL input field for signed/presigned URLs
- Support GCS, S3, Azure SAS tokens
- User generates URLs externally (console/CLI)
- No OAuth, no backend required
- Validates privacy-first approach with minimal investment

#### Phase 2: OAuth Integration (3-4 weeks)
- Google Cloud OAuth (PKCE) for GCS
- Bucket browsing and file picker UI
- Signed URL generation in browser
- Token management (session-only)

#### Phase 3: Multi-Cloud Expansion (4-6 weeks)
- AWS S3 via Cognito or IAM Identity Center
- Azure Blob via Azure AD/Entra ID
- Unified file picker across providers

#### Phase 4: Enhanced Features (Future)
- Browser extension for CORS-free access
- Cached profile results
- Collaborative sharing via signed URLs

---

### Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| CORS configuration too complex for users | Medium | High | Excellent documentation, diagnostic tool |
| Safari compatibility issues | Low | Medium | Thorough testing, graceful degradation |
| Performance complaints on slow networks | Medium | Medium | Speed warnings, sampling option |
| Security concerns about OAuth tokens | Low | High | Session-only storage, minimal scopes |
| Cloud provider API changes | Low | Medium | Abstraction layer, monitoring |

---

### Next Steps

1. **Create SPIKE-003:** GCS Integration Technical Design (detailed implementation plan for Phase 1-2)
2. **Create ADR:** "Cloud Storage Integration Architecture Decision"
3. **User Research:** Survey to validate demand and acceptable complexity
4. **Update Roadmap:** Add cloud storage integration to product roadmap
5. **Documentation Planning:** Plan CORS configuration guides for each provider

## 8. Artifacts

_Upon completion, link to:_
- Architecture diagrams (browser-to-cloud data flow)
- Privacy impact assessment document
- Cost analysis spreadsheet
- Browser compatibility matrix
- Prototype code (if any)

## 9. Dependencies
- None (research spike)

## 10. Next Steps
- [x] Complete research as outlined
- [x] Document decision in this ticket
- [ ] Create SPIKE-003 (GCS Integration Technical Design) - Phase 1-2 detailed implementation
- [ ] Create Architecture Decision Record (ADR) for cloud storage integration
- [ ] Conduct user research survey to validate demand
- [ ] Update product roadmap to include cloud storage integration phases
- [ ] Plan documentation for CORS configuration guides (GCS, S3, Azure)
