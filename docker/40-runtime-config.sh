#!/bin/sh
set -eu

: "${API_BASE_URL:=https://www.leilasinorebooksapi.online}"
export API_BASE_URL

case "$API_BASE_URL" in
  http://*|https://*) ;;
  *)
    echo "API_BASE_URL must start with http:// or https://" >&2
    exit 1
    ;;
esac

case "$API_BASE_URL" in
  *\"*|*\\*)
    echo "API_BASE_URL cannot contain quotes or backslashes" >&2
    exit 1
    ;;
esac

envsubst '${API_BASE_URL}' \
  < /opt/runtime-config.template.js \
  > /usr/share/nginx/html/config.js
