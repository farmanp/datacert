# AI-Ready Story Template (Core)

## 1. Intent (Required)
**User Story:**
As a data engineer
I want to profile files stored in Google Cloud Storage directly from my browser
So that I can analyze cloud-hosted datasets without downloading them locally first

**Success Looks Like:**
Users provide a GCS file URL (gs:// or https://), authenticate (OAuth or signed URL), and DataLens streams and profiles the file with the same statistics and visualizations as local files.

## 2. Context & Constraints (Required)
**Background:**
Many data teams store datasets in GCS as part of their data lake or warehouse architecture. Currently, users must download files locally before profiling, which is slow, requires disk space, and creates data locality issues. Direct GCS integration eliminates the download step while maintaining browser-based, privacy-preserving processing.

**Scope:**
- **In Scope:**
  - OAuth 2.0 authentication flow (Google Identity Services)
  - Read-only access to GCS files via `fetch()` + `ReadableStream`
  - CORS configuration validation and user guidance
  - Streaming GCS files to existing WASM profiler
  - Error handling (401, 403, 404, network errors, CORS failures)
  - Progress indication for network streaming
  - Support for `gs://bucket/path` and `https://storage.googleapis.com/...` URLs
  - Token refresh when OAuth access token expires
  - UI for GCS URL input and authentication status

- **Out of Scope:**
  - File browsing/listing UI (user must provide file URL)
  - Write operations (upload, delete, modify)
  - Signed URL generation (backend service) - may be future enhancement
  - Multi-file batch processing from GCS
  - GCS bucket management features
  - BigQuery or other database integrations
  - Support for other cloud providers (S3, Azure) - separate tickets

**Constraints:**
- Must preserve "data never leaves device" privacy model (data streams to browser, not to backend)
- OAuth tokens must not be sent to DataLens backend
- Performance target: GCS streaming should not add >20% latency vs local files
- CORS must be user-configurable on their GCS buckets (we can't control their infra)
- Mobile browser OAuth support required (popup vs redirect)
- Browser compatibility: Chrome 90+, Firefox 88+, Safari 14+

## 3. Acceptance Criteria (Required)
*Format: Gherkin (Given/When/Then)*

**Scenario: Authenticate with GCS via OAuth**
Given I am on the DataLens landing page
When I select "Profile from Google Cloud Storage"
And I click "Sign in with Google"
Then I see a Google OAuth consent screen
And I grant permission for "View read-only access to Cloud Storage"
And I am redirected back to DataLens
And I see "Authenticated as user@example.com"

**Scenario: Profile GCS file via https:// URL**
Given I am authenticated with Google OAuth
When I paste a GCS URL "https://storage.googleapis.com/my-bucket/data.csv"
And I click "Profile"
Then DataLens fetches the file via authenticated `fetch()`
And the file streams to the WASM profiler
And I see progress indicator showing "Downloading: 45% (23MB / 50MB)"
And profiling completes with statistics identical to local file analysis

**Scenario: Profile GCS file via gs:// URL**
Given I am authenticated with Google OAuth
When I paste a GCS URL "gs://my-bucket/subfolder/data.csv"
Then DataLens converts `gs://` to `https://storage.googleapis.com/` format
And fetches the file as in previous scenario

**Scenario: Handle CORS not configured**
Given I paste a GCS URL from a bucket without CORS enabled
When I click "Profile"
Then DataLens attempts to fetch the file
And receives a CORS error
And I see an error message: "CORS not enabled on bucket 'my-bucket'"
And I see a link to CORS setup guide

**Scenario: Handle expired OAuth token**
Given I authenticated 1 hour ago (token expired)
When I attempt to profile a GCS file
Then DataLens detects 401 Unauthorized response
And automatically triggers token refresh
And retries the request with new token
And profiling succeeds

**Scenario: Handle file not found (404)**
Given I paste a GCS URL to a non-existent file
When I click "Profile"
Then I receive a 404 error
And I see "File not found: gs://my-bucket/missing.csv"
And I am prompted to verify the URL

**Scenario: Handle access denied (403)**
Given I paste a GCS URL to a file I don't have permission to read
When I click "Profile"
Then I receive a 403 Forbidden error
And I see "Access denied. Check bucket permissions."
And I am offered option to re-authenticate

**Scenario: Network interruption during streaming**
Given I am profiling a 200MB file from GCS
And 50% of the file has been processed
When my network connection drops
Then DataLens detects the stream interruption
And I see "Network error: connection lost"
And I am offered option to retry

**Scenario: Compare GCS performance to local**
Given I have a 100MB CSV file both locally and on GCS
When I profile the local file
Then it completes in ~8 seconds
When I profile the same file from GCS on a 50 Mbps connection
Then it completes in <10 seconds (< 25% overhead)

## 4. AI Execution Instructions (Required)
**Allowed to Change:**
- `src/app/services/gcs-auth.service.ts` - OAuth flow and token management (create)
- `src/app/services/gcs-streaming.service.ts` - GCS file fetching (create)
- `src/app/components/FileInput.tsx` - Add GCS URL input mode
- `src/app/components/GCSAuthButton.tsx` - OAuth sign-in UI (create)
- `src/app/workers/parser.worker.ts` - Handle ReadableStream from `fetch()`
- `src/app/stores/auth.store.ts` - Store OAuth tokens and user state (create)
- `vite.config.ts` - Environment variables for GCS OAuth client ID
- `.env.example` - Document required env vars
- `docs/user-guides/gcs-setup.md` - CORS configuration guide (create)

**Must NOT Change:**
- WASM profiler core (`src/wasm/`) - must work with any ReadableStream
- Statistics algorithms (Welford's, t-digest, etc.)
- Existing local file upload flow
- CSV/JSON/Parquet parsers

**Ambiguity Rule:**
If unclear, acceptance criteria override all other sections.

## 5. Planned Git Commit Message(s) (Required)
```
feat(gcs): add OAuth authentication for Google Cloud Storage

- Implement OAuth 2.0 PKCE flow using Google Identity Services
- Store access tokens in sessionStorage (not localStorage for security)
- Handle token refresh when expired (1-hour TTL)

BREAKING CHANGE: None
```

```
feat(gcs): add streaming support for GCS files

- Fetch GCS files via authenticated fetch() + ReadableStream
- Convert gs:// URLs to https://storage.googleapis.com/ format
- Stream directly to existing WASM profiler (no changes to parser)
- Add progress indicator for network download phase

Closes: SPIKE-003
```

```
feat(gcs): add CORS and error handling for GCS integration

- Detect and display helpful CORS error messages
- Handle 401/403/404 errors with user-friendly messages
- Retry logic for network interruptions
- Link to CORS setup guide for user-owned buckets
```

```
docs(gcs): add GCS CORS configuration guide

- Step-by-step gsutil corsconfig setup
- Example CORS JSON policy
- Troubleshooting common CORS errors
```

## 6. Verification & Definition of Done (Required)
- [ ] All acceptance criteria scenarios pass (manual testing)
- [ ] OAuth flow works in Chrome, Firefox, Safari
- [ ] GCS streaming works with 10MB, 100MB, 500MB files
- [ ] CORS error shows helpful message and guide link
- [ ] Token refresh works after 1-hour expiration
- [ ] 404 and 403 errors display user-friendly messages
- [ ] Network interruption recovery works
- [ ] Performance: GCS streaming < 25% slower than local (100MB file test)
- [ ] No OAuth tokens sent to DataLens backend (verified via network inspector)
- [ ] Mobile browser testing (Chrome Android, Safari iOS)
- [ ] Unit tests for GCS URL conversion (gs:// → https://)
- [ ] Unit tests for token refresh logic
- [ ] Integration test: end-to-end GCS → profiling flow (with test bucket)
- [ ] Code reviewed
- [ ] CORS setup guide reviewed and tested

## 7. Resources
- Google Cloud Storage CORS: https://cloud.google.com/storage/docs/cross-origin
- Google Identity Services (OAuth): https://developers.google.com/identity/gsi/web
- OAuth 2.0 PKCE: https://oauth.net/2/pkce/
- GCS REST API: https://cloud.google.com/storage/docs/json_api
- Signed URLs (future enhancement): https://cloud.google.com/storage/docs/access-control/signed-urls

## 8. Dependencies
- **Depends on:** SPIKE-002 (Cloud Storage Feasibility) - decision to proceed
- **Depends on:** SPIKE-003 (GCS Integration Design) - authentication method chosen
- **Blocks:** FEAT-016 (S3 Integration) - if successful, pattern can be reused
- **Blocks:** FEAT-017 (Azure Blob Integration) - similar architecture

## 9. Notes
**OAuth Client ID Setup:**
- Create OAuth 2.0 credentials in Google Cloud Console
- Authorized JavaScript origins: `http://localhost:5173`, `https://datalens.app`
- Scopes: `https://www.googleapis.com/auth/devstorage.read_only`
- Store Client ID in `.env` (not committed), document in `.env.example`

**Cost Implications:**
- User pays GCS egress costs from their own bucket (~$0.12/GB)
- No cost to DataLens infrastructure
- Profiling 100MB file ≈ $0.012 in user's GCP bill

**Future Enhancements (Out of Scope):**
- Signed URLs for demo files (requires backend service)
- File browser UI (list bucket contents)
- Multi-cloud abstraction layer (support GCS, S3, Azure via unified interface)
- BigQuery integration (different architecture, separate spike needed)
