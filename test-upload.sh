#!/bin/bash

# Script de test pour l'upload d'images
# Usage: ./test-upload.sh [BASE_URL]
# Exemple: ./test-upload.sh http://localhost:3001

BASE_URL="${1:-http://localhost:3001}"

echo "=========================================="
echo "🧪 Tests d'upload d'images"
echo "=========================================="
echo "Base URL: ${BASE_URL}"
echo ""

# Test 1: Vérifier que le serveur est accessible
echo "📋 Test 1: Vérifier que le serveur est accessible"
echo "GET ${BASE_URL}/api/health"
response=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/health")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
  echo "✅ Serveur accessible (HTTP $http_code)"
  echo "Réponse: $body"
else
  echo "❌ Serveur non accessible (HTTP $http_code)"
  echo "Assurez-vous que le serveur est démarré avec: cd piol-backend && npm run dev"
  exit 1
fi
echo ""

# Test 2: Vérifier que la route test est accessible
echo "📋 Test 2: Vérifier que la route /api/uploads/test est accessible"
echo "GET ${BASE_URL}/api/uploads/test"
response=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/uploads/test")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
  echo "✅ Route test accessible (HTTP $http_code)"
  echo "Réponse: $body"
else
  echo "❌ Route test non accessible (HTTP $http_code)"
  echo "Réponse: $body"
fi
echo ""

# Test 3: Créer un fichier image de test
echo "📋 Test 3: Créer un fichier image de test"
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > /tmp/test-image.png
if [ -f /tmp/test-image.png ]; then
  echo "✅ Fichier créé: /tmp/test-image.png ($(stat -c%s /tmp/test-image.png) bytes)"
else
  echo "❌ Impossible de créer le fichier de test"
  exit 1
fi
echo ""

# Test 4: Tester l'upload SANS authentification (route de test)
echo "📋 Test 4: Tester l'upload SANS authentification"
echo "POST ${BASE_URL}/api/uploads/test-upload"
echo "Fichier: /tmp/test-image.png"
response=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/uploads/test-upload" \
  -F "image=@/tmp/test-image.png")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
  echo "✅ Upload réussi (HTTP $http_code)"
  echo "Réponse: $body"
else
  echo "❌ Upload échoué (HTTP $http_code)"
  echo "Réponse: $body"
fi
echo ""

# Test 5: Instructions pour tester avec authentification
echo "📋 Test 5: Pour tester avec authentification"
echo "1. Obtenez un token via:"
echo "   curl -X POST \"${BASE_URL}/api/auth/login\" \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"email\":\"votre@email.com\",\"password\":\"votre_mot_de_passe\"}'"
echo ""
echo "2. Utilisez le token pour uploader:"
echo "   curl -X POST \"${BASE_URL}/api/uploads/property-image\" \\"
echo "     -F \"image=@/tmp/test-image.png\" \\"
echo "     -H \"Authorization: Bearer VOTRE_TOKEN\""
echo ""

echo "=========================================="
echo "✅ Tests terminés"
echo "=========================================="
