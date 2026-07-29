#!/bin/bash
# Deploy a Cloud Run
# Requiere: gcloud auth login, proyecto GCP configurado
# Uso: ./deploy.sh

set -e

PROJECT_ID=${GCP_PROJECT_ID:?Falta GCP_PROJECT_ID}
REGION=${GCP_REGION:-us-central1}
SERVICE=oficinita
IMAGE=gcr.io/$PROJECT_ID/$SERVICE

echo "Building image: $IMAGE"
docker build -t "$IMAGE" .

echo "Pushing to GCR..."
docker push "$IMAGE"

echo "Deploying to Cloud Run ($REGION)..."
gcloud run deploy "$SERVICE" \
  --image "$IMAGE" \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated \
  --port 3000 \
  --set-env-vars "\
NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY,\
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,\
NEXT_PUBLIC_FIREBASE_DATABASE_URL=$NEXT_PUBLIC_FIREBASE_DATABASE_URL,\
NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID,\
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,\
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,\
NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID"

echo "Done. URL:"
gcloud run services describe "$SERVICE" --region "$REGION" --format "value(status.url)"
