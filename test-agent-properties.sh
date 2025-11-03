#!/bin/bash

# Se connecter en tant qu'agent pour obtenir le token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"agent@casaneo.io","password":"12345678"}' | jq -r '.token')

echo "Token: $TOKEN"
echo ""

# Récupérer les propriétés de l'agent
echo "=== My Properties ==="
curl -s -X GET http://localhost:3001/api/properties/my-properties \
  -H "Authorization: Bearer $TOKEN" | jq '.'
