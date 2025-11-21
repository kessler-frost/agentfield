#!/bin/sh
# wait-for-services.sh - Wait for AgentField control plane to be ready

set -e

CONTROL_PLANE_URL="${AGENTFIELD_SERVER:-http://control-plane:8080}"
HEALTH_ENDPOINT="${CONTROL_PLANE_URL}/api/v1/health"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-60}"
SLEEP_INTERVAL="${SLEEP_INTERVAL:-2}"

echo "Waiting for AgentField control plane at ${CONTROL_PLANE_URL}..."

attempt=0
while [ $attempt -lt $MAX_ATTEMPTS ]; do
    attempt=$((attempt + 1))
    
    # Try to reach the health endpoint
    if wget --spider --timeout=2 --tries=1 "${HEALTH_ENDPOINT}" 2>/dev/null; then
        echo "✓ Control plane is ready!"
        exit 0
    fi
    
    echo "Attempt $attempt/$MAX_ATTEMPTS: Control plane not ready yet..."
    sleep $SLEEP_INTERVAL
done

echo "✗ Control plane failed to become ready after $MAX_ATTEMPTS attempts"
exit 1

