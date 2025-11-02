#!/bin/bash

# Script pour démarrer MongoDB localement
echo "🚀 Démarrage de MongoDB..."

# Vérifier si MongoDB est installé
if ! command -v mongod &> /dev/null; then
    echo "❌ MongoDB n'est pas installé."
    echo "📥 Installation avec Docker (recommandé):"
    echo "docker run --name piol-mongodb -p 27017:27017 -d mongo:latest"
    echo ""
    echo "📥 Ou installation native:"
    echo "Ubuntu/Debian: sudo apt-get install mongodb"
    echo "macOS: brew install mongodb-community"
    exit 1
fi

# Créer le dossier de données si nécessaire
mkdir -p ./data/db

# Démarrer MongoDB
echo "🔄 Démarrage de MongoDB sur le port 27017..."
mongod --dbpath ./data/db --port 27017 --bind_ip 127.0.0.1

echo "✅ MongoDB démarré avec succès!"
echo "📍 Connexion: mongodb://localhost:27017/piol_db"
