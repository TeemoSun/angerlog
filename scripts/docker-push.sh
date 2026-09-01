#!/usr/bin/env bash
set -euo pipefail

USER="${GHCR_USER:-teemosun}"
REGISTRY="${GHCR_REGISTRY:-ghcr.io}"
IMAGE="${REGISTRY}/${USER}/angerlog"
DATE_TAG="$(date +%Y%m%d)"
SHA_TAG="sha-$(git rev-parse --short HEAD)"

echo "==> Building $IMAGE:latest, :$DATE_TAG, and :$SHA_TAG"
docker build -t "$IMAGE:latest" -t "$IMAGE:$DATE_TAG" -t "$IMAGE:$SHA_TAG" .

echo "==> Pushing tags"
docker push "$IMAGE:latest"
docker push "$IMAGE:$DATE_TAG"
docker push "$IMAGE:$SHA_TAG"

echo "==> Done: $IMAGE:latest, $IMAGE:$DATE_TAG, $IMAGE:$SHA_TAG"