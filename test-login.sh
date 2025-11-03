#!/bin/bash

# Script de test pour le login API
# Usage: ./test-login.sh

API_URL="https://piol.onrender.com/api"

echo "🔍 Test de connexion à l'API PIOL"
echo "=================================="
echo ""

# 1. Test du health check
echo "1️⃣ Test du health check..."
curl -s "${API_URL}/health" | jq '.' || echo "❌ Erreur de connexion"
echo ""
echo ""

# 2. Test de login avec des credentials de test
echo "2️⃣ Test de login..."
echo "Remplissez votre email et mot de passe :"
read -p "Email: " EMAIL
read -sp "Mot de passe: " PASSWORD
echo ""

RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"${EMAIL}\", \"password\": \"${PASSWORD}\"}")

echo "Réponse:"
echo "$RESPONSE" | jq '.' || echo "$RESPONSE"

# Extraire le token si succès
TOKEN=$(echo "$RESPONSE" | jq -r '.token // empty')

if [ ! -z "$TOKEN" ]; then
  echo ""
  echo "✅ Login réussi!"
  echo "Token: ${TOKEN:0:50}..."
  echo ""
  
  # 3. Test de vérification du token
  echo "3️⃣ Test de vérification du token..."
  curl -s -X GET "${API_URL}/auth/verify" \
    -H "Authorization: Bearer ${TOKEN}" | jq '.' || echo "❌ Erreur"
else
  echo ""
  echo "❌ Login échoué"
fi

