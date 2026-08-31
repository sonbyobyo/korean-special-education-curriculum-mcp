#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-korean-special-education-mcp}"
REGION="${REGION:-asia-northeast3}"
PROJECT_ID="$(gcloud config get-value project 2>/dev/null)"

if [[ -z "${PROJECT_ID}" || "${PROJECT_ID}" == "(unset)" ]]; then
  echo "Select a Google Cloud project first, then run this script again." >&2
  exit 1
fi

gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  --project "${PROJECT_ID}"

gcloud run deploy "${SERVICE_NAME}" \
  --source . \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --allow-unauthenticated \
  --set-env-vars MCP_TRANSPORT=http,MCP_RATE_LIMIT_PER_MINUTE=120 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 2 \
  --concurrency 10

SERVICE_URL="$(gcloud run services describe "${SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --format='value(status.url)')"

printf '\nHealth check: %s/healthz\nChatGPT MCP URL: %s/mcp\n' "${SERVICE_URL}" "${SERVICE_URL}"
