# Google Cloud Storage (GCS) Setup Guide

To profile files directly from your GCS buckets, you need to configure Cross-Origin Resource Sharing (CORS) on your bucket. This allows the DataLens application (running in your browser) to fetch data from Google's servers.

## 1. Create a CORS Configuration File

Create a file named `cors.json` locally:

```json
[
    {
      "origin": ["http://localhost:5173", "https://datalens.app"],
      "method": ["GET", "HEAD"],
      "responseHeader": ["Content-Type", "Content-Length", "Authorization", "Range"],
      "maxAgeSeconds": 3600
    }
]
```

*Note: Replace `https://datalens.app` with your actual deployment domain if different.*

## 2. Apply the Configuration

Use the `gsutil` command-line tool (part of Google Cloud SDK) to apply this configuration to your bucket:

```bash
gsutil cors set cors.json gs://YOUR_BUCKET_NAME
```

Or using `gcloud`:

```bash
gcloud storage buckets update gs://YOUR_BUCKET_NAME --cors-file=cors.json
```

## 3. Verify Access

1. Open DataLens Profiler.
2. Sign in with Google.
3. Paste the URL of a file in that bucket (e.g., `gs://YOUR_BUCKET_NAME/data.csv`).
4. Click "Profile File".

## Troubleshooting

### "CORS not enabled on bucket"
If you see this error, it means the browser blocked the request because the `Access-Control-Allow-Origin` header was missing.
*   Wait a few minutes after applying the CORS config (it can take time to propagate).
*   Ensure the `origin` in `cors.json` matches exactly where you are running DataLens (check `http` vs `https` and port numbers).

### "403 Forbidden"
*   Ensure the authenticated Google user has `Storage Object Viewer` permission on the bucket or file.
*   If using Uniform Bucket Level Access, ensure permissions are granted at the bucket level.

### "401 Unauthorized"
*   Your session may have expired. Click "Sign out" and sign in again to refresh your token.
