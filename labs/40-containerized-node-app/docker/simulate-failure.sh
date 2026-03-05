#!/bin/bash

# Script to simulate container failure for liveness probe demonstration

POD_NAME=$(kubectl get pods -n quote-lab -l app=quote-app -o jsonpath='{.items[0].metadata.name}')

echo "Current pod: $POD_NAME"
echo "Current restart count:"
kubectl get pod $POD_NAME -n quote-lab -o jsonpath='{.status.containerStatuses[0].restartCount}'
echo ""

echo ""
echo "Simulating failure by killing the Node.js process inside the container..."
echo "This will cause the liveness probe to fail and trigger a restart."
echo ""

# Kill the Node.js process (PID 1) inside the container
kubectl exec -n quote-lab $POD_NAME -- kill 1

echo "Process killed. Monitoring pod status..."
echo ""
echo "Watch the RESTARTS column increase:"
kubectl get pods -n quote-lab -l app=quote-app -w
