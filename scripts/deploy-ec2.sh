#!/usr/bin/env sh
set -eu

if [ "$#" -ne 3 ]; then
  echo "Usage: $0 <image-uri> <secret-id> <aws-region>" >&2
  exit 2
fi

IMAGE_URI=$1
SECRET_ID=$2
AWS_REGION=$3

for command_name in aws docker jq curl; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Required command is missing: $command_name" >&2
    exit 1
  fi
done

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 is required." >&2
  exit 1
fi

secret_json=$(aws secretsmanager get-secret-value \
  --secret-id "$SECRET_ID" \
  --region "$AWS_REGION" \
  --query SecretString \
  --output text)

API_BASE_URL=$(printf '%s' "$secret_json" | jq -er '.API_BASE_URL // .VITE_API_BASE_URL')
case "$API_BASE_URL" in
  http://*|https://*) ;;
  *)
    echo "Secrets Manager value API_BASE_URL must start with http:// or https://" >&2
    exit 1
    ;;
esac

ECR_REGISTRY=${IMAGE_URI%%/*}
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR_REGISTRY"

export IMAGE_URI API_BASE_URL

current_container=$(docker compose ps -q frontend || true)
previous_image=""
if [ -n "$current_container" ]; then
  previous_image=$(docker inspect --format '{{.Config.Image}}' "$current_container")
fi

docker compose pull frontend
docker compose up -d --no-build --remove-orphans frontend

attempt=1
while [ "$attempt" -le 12 ]; do
  if curl --fail --silent --show-error http://127.0.0.1/healthz >/dev/null; then
    echo "Deployment is healthy: $IMAGE_URI"
    exit 0
  fi
  attempt=$((attempt + 1))
  sleep 5
done

echo "Deployment failed its health check." >&2
docker compose ps
docker compose logs --tail=100 frontend

if [ -n "$previous_image" ] && [ "$previous_image" != "$IMAGE_URI" ]; then
  echo "Rolling back to $previous_image" >&2
  IMAGE_URI=$previous_image
  export IMAGE_URI
  docker compose up -d --no-build --remove-orphans frontend
fi

exit 1
