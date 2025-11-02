# 🚀 Déploiement rapide sur Render

## Guide rapide (5 minutes)

### 1. Préparer MongoDB

Créer un compte sur [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) et obtenir votre URL de connexion :
```
mongodb+srv://username:password@cluster.mongodb.net/piol?retryWrites=true&w=majority
```

### 2. Pousser le code sur GitHub

```bash
cd piol-backend
git add .
git commit -m "Ready for deployment"
git push
```

### 3. Créer le service sur Render

1. Allez sur [dashboard.render.com](https://dashboard.render.com)
2. Cliquez sur **"New +"** → **"Web Service"**
3. Connectez votre repository GitHub
4. Sélectionnez `piol-backend`

### 4. Configuration Render

**Build Command** :
```
npm install && npm run build && npx prisma generate
```

**Start Command** :
```
npm start
```

**Variables d'environnement** (dans "Environment") :
```
NODE_ENV=production
PORT=10000
DATABASE_URL=<votre-url-mongodb>
JWT_SECRET=<générez-un-secret-fort>
JWT_EXPIRES_IN=7d
```

**Générer un JWT_SECRET** :
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 5. Déployer

Cliquez sur **"Create Web Service"** et attendez 2-3 minutes.

### 6. Initialiser la base de données

Une fois déployé, dans Render :
1. Allez dans votre service → **"Shell"**
2. Exécutez : `npx prisma db push`

### 7. Tester

Votre API sera disponible à :
```
https://votre-service.onrender.com/api/health
```

## ✅ Votre URL de production

Après déploiement, vous obtiendrez une URL comme :
```
https://piol-backend.onrender.com
```

Mettez à jour votre frontend pour utiliser cette URL !

## 📝 Notes importantes

- **Plan gratuit** : L'app se met en veille après 15 min d'inactivité
- **Premier démarrage** : Peut prendre 30-60 secondes après veille
- **Variables sensibles** : Ne jamais commiter `.env` dans Git

Pour plus de détails, consultez `DEPLOY.md`

