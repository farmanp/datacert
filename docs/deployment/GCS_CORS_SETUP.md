# GCS CORS Configuration Guide

This guide explains how to configure CORS (Cross-Origin Resource Sharing) on Google Cloud Storage buckets to enable direct browser access from DataCert.

## Why CORS is Required

DataCert runs entirely in your browser. When accessing files from GCS, the browser enforces CORS policies to prevent unauthorized cross-origin requests. Without proper CORS configuration, the browser will block requests to your GCS bucket.

## Quick Setup

### Step 1: Create CORS Configuration File

Create a file named `cors.json` with the following content:

```json
[
  {
    "origin": ["https://datacert.app", "http://localhost:3000"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type", "Content-Length", "Content-Range"],
    "maxAgeSeconds": 3600
  }
]
```

**Customization options:**

| Field | Description | Recommendation |
|-------|-------------|----------------|
| `origin` | Allowed origins | Add your domain if self-hosting |
| `method` | HTTP methods | GET and HEAD are sufficient for read-only |
| `responseHeader` | Headers to expose | Required for progress tracking |
| `maxAgeSeconds` | Cache preflight responses | 3600 (1 hour) is reasonable |

### Step 2: Apply CORS Configuration

Using `gsutil`:

```bash
gsutil cors set cors.json gs://YOUR_BUCKET_NAME
```

Using `gcloud`:

```bash
gcloud storage buckets update gs://YOUR_BUCKET_NAME --cors-file=cors.json
```

### Step 3: Verify Configuration

```bash
gsutil cors get gs://YOUR_BUCKET_NAME
```

Expected output:
```json
[{"maxAgeSeconds": 3600, "method": ["GET", "HEAD"], "origin": ["https://datacert.app", "http://localhost:3000"], "responseHeader": ["Content-Type", "Content-Length", "Content-Range"]}]
```

## Required Permissions

To set CORS configuration, you need one of:

- `storage.buckets.update` permission
- `roles/storage.admin` role
- `roles/storage.legacyBucketOwner` role

Check your permissions:
```bash
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:YOUR_EMAIL"
```

## Environment-Specific Configurations

### Development (localhost)

```json
[
  {
    "origin": ["http://localhost:3000", "http://localhost:5173"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type", "Content-Length", "Content-Range"],
    "maxAgeSeconds": 300
  }
]
```

### Production

```json
[
  {
    "origin": ["https://datacert.app"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type", "Content-Length", "Content-Range"],
    "maxAgeSeconds": 3600
  }
]
```

### Combined (Dev + Production)

```json
[
  {
    "origin": [
      "https://datacert.app",
      "https://your-company.datacert.app",
      "http://localhost:3000"
    ],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type", "Content-Length", "Content-Range"],
    "maxAgeSeconds": 3600
  }
]
```

## Troubleshooting

### Error: "CORS policy blocked"

**Symptoms:**
- Browser console shows: `Access to fetch at 'https://storage.googleapis.com/...' has been blocked by CORS policy`
- DataCert shows: "Network error or CORS block"

**Solutions:**
1. Verify CORS is set: `gsutil cors get gs://YOUR_BUCKET`
2. Check origin matches exactly (including protocol and port)
3. Wait a few minutes for changes to propagate

### Error: "No 'Access-Control-Allow-Origin' header"

**Cause:** CORS not configured or origin mismatch

**Solution:**
```bash
# Re-apply CORS configuration
gsutil cors set cors.json gs://YOUR_BUCKET

# Verify
curl -I -H "Origin: https://datacert.app" \
  "https://storage.googleapis.com/YOUR_BUCKET/test.csv"
```

Look for `Access-Control-Allow-Origin` in response headers.

### Error: 403 Forbidden (not CORS)

**Cause:** Authentication or permission issue, not CORS

**Solutions:**
1. Sign in with Google in DataCert
2. Verify your account has `storage.objects.get` permission
3. Check bucket IAM policy:
   ```bash
   gsutil iam get gs://YOUR_BUCKET
   ```

### Error: 404 Not Found

**Cause:** File doesn't exist or wrong path

**Solution:**
```bash
# Verify file exists
gsutil ls gs://YOUR_BUCKET/path/to/file.csv
```

## Security Considerations

### Principle of Least Privilege

- Only allow `GET` and `HEAD` methods (read-only)
- Specify exact origins (avoid `*` wildcard)
- Use HTTPS origins in production

### Public vs. Private Buckets

**Public buckets:**
- CORS allows browser access
- No authentication required
- Anyone with URL can access

**Private buckets (recommended):**
- CORS allows browser access
- OAuth2 authentication required
- User must have GCS permissions
- DataCert prompts for Google Sign-In

### Wildcard Origins (Not Recommended)

```json
{
  "origin": ["*"]
}
```

This allows any website to access your bucket. Only use for truly public data.

## Automation

### Terraform

```hcl
resource "google_storage_bucket" "data_bucket" {
  name     = "your-bucket-name"
  location = "US"

  cors {
    origin          = ["https://datacert.app", "http://localhost:3000"]
    method          = ["GET", "HEAD"]
    response_header = ["Content-Type", "Content-Length", "Content-Range"]
    max_age_seconds = 3600
  }
}
```

### Pulumi (TypeScript)

```typescript
const bucket = new gcp.storage.Bucket("data-bucket", {
  location: "US",
  cors: [{
    origins: ["https://datacert.app", "http://localhost:3000"],
    methods: ["GET", "HEAD"],
    responseHeaders: ["Content-Type", "Content-Length", "Content-Range"],
    maxAgeSeconds: 3600,
  }],
});
```

### Shell Script

```bash
#!/bin/bash
BUCKET_NAME=$1

cat > /tmp/cors.json << 'EOF'
[{
  "origin": ["https://datacert.app", "http://localhost:3000"],
  "method": ["GET", "HEAD"],
  "responseHeader": ["Content-Type", "Content-Length", "Content-Range"],
  "maxAgeSeconds": 3600
}]
EOF

gsutil cors set /tmp/cors.json gs://$BUCKET_NAME
echo "CORS configured for gs://$BUCKET_NAME"
gsutil cors get gs://$BUCKET_NAME
```

Usage:
```bash
./setup-cors.sh your-bucket-name
```

## Testing CORS Configuration

### Browser DevTools

1. Open DataCert in browser
2. Open DevTools (F12) > Network tab
3. Attempt to load a GCS file
4. Check for CORS headers in response

### cURL Test

```bash
# Preflight request
curl -I -X OPTIONS \
  -H "Origin: https://datacert.app" \
  -H "Access-Control-Request-Method: GET" \
  "https://storage.googleapis.com/YOUR_BUCKET/test.csv"

# Actual request
curl -I \
  -H "Origin: https://datacert.app" \
  "https://storage.googleapis.com/YOUR_BUCKET/test.csv"
```

Expected headers:
```
Access-Control-Allow-Origin: https://datacert.app
Access-Control-Allow-Methods: GET, HEAD
Access-Control-Expose-Headers: Content-Type, Content-Length, Content-Range
```

## Support

If you continue to experience CORS issues after following this guide:

1. Check browser console for specific error messages
2. Verify bucket name and file path are correct
3. Ensure CORS changes have propagated (wait 5 minutes)
4. Try in an incognito window to rule out cache issues

For additional help, open an issue at: https://github.com/anthropics/datacert/issues
