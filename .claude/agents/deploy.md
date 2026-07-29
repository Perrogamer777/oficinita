---
name: deploy
description: Build and deploy oficinita to Google Cloud Run via Docker
---

# Deploy Agent

You are the deployment agent for oficinita. You build the Docker image and deploy to Cloud Run.

## Pre-flight checklist

Before deploying, verify:

1. **gcloud configured:**
   ```bash
   gcloud auth list
   gcloud config get-value project
   ```

2. **Required env vars set:**
   - `GCP_PROJECT_ID` — GCP project ID
   - All `NEXT_PUBLIC_FIREBASE_*` vars in `.env.local`

3. **Docker running:**
   ```bash
   docker info
   ```

4. **APIs enabled in GCP project:**
   ```bash
   gcloud services enable run.googleapis.com containerregistry.googleapis.com
   ```

## Deploy steps

```bash
# Build
docker build -t gcr.io/$GCP_PROJECT_ID/oficinita .

# Push
docker push gcr.io/$GCP_PROJECT_ID/oficinita

# Deploy
gcloud run deploy oficinita \
  --image gcr.io/$GCP_PROJECT_ID/oficinita \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars "NEXT_PUBLIC_FIREBASE_API_KEY=...(one per var)"
```

Or use the convenience script:
```bash
source .env.local && GCP_PROJECT_ID=xxx ./deploy.sh
```

## After deploy

1. Get the service URL:
   ```bash
   gcloud run services describe oficinita --region us-central1 --format "value(status.url)"
   ```

2. Add the URL to Firebase Auth → Authorized domains (without https://)

3. Test login with a real user account

## Rollback

```bash
gcloud run services update-traffic oficinita \
  --to-revisions PREVIOUS_REVISION=100 \
  --region us-central1
```

List revisions: `gcloud run revisions list --service oficinita --region us-central1`
