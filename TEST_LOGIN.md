# 🧪 Guide de test du Login

## Méthode 1 : Test avec curl (Terminal)

### Test rapide du health check

```bash
curl https://piol.onrender.com/api/health
```

**Résultat attendu** :
```json
{
  "status": "OK",
  "message": "PIOL Backend API is running",
  "timestamp": "2025-11-02T04:55:34.000Z",
  "version": "1.0.0"
}
```

### Test du login

**⚠️ Important** : Vous devez d'abord créer un utilisateur via `/api/auth/register`

#### Étape 1 : Créer un utilisateur (si vous n'en avez pas)

```bash
curl -X POST https://piol.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@piol.com",
    "phone": "+237612345678",
    "password": "Test123456",
    "firstName": "Test",
    "lastName": "User",
    "userType": "TENANT"
  }'
```

**Résultat attendu** :
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "...",
    "email": "test@piol.com",
    "firstName": "Test",
    "lastName": "User",
    ...
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Étape 2 : Tester le login

```bash
curl -X POST https://piol.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@piol.com",
    "password": "Test123456"
  }'
```

**Résultat attendu (succès)** :
```json
{
  "message": "Login successful",
  "user": {
    "id": "...",
    "email": "test@piol.com",
    "firstName": "Test",
    "lastName": "User",
    "userType": "TENANT",
    ...
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Résultat attendu (échec)** :
```json
{
  "error": "Invalid credentials",
  "message": "Email or password is incorrect"
}
```

#### Étape 3 : Vérifier le token

Remplacez `<TOKEN>` par le token reçu :

```bash
curl -X GET https://piol.onrender.com/api/auth/verify \
  -H "Authorization: Bearer <TOKEN>"
```

**Résultat attendu** :
```json
{
  "message": "Token is valid",
  "user": {
    "id": "...",
    "email": "test@piol.com",
    ...
  }
}
```

---

## Méthode 2 : Test avec Postman ou Insomnia

### Configuration

1. **URL** : `https://piol.onrender.com/api/auth/login`
2. **Méthode** : `POST`
3. **Headers** :
   ```
   Content-Type: application/json
   ```
4. **Body** (JSON) :
   ```json
   {
     "email": "test@piol.com",
     "password": "Test123456"
   }
   ```

### Tests à effectuer

#### ✅ Test 1 : Login avec bons identifiants
- Email valide + mot de passe correct
- **Attendu** : Status 200, token retourné

#### ❌ Test 2 : Login avec mauvais mot de passe
- Email valide + mot de passe incorrect
- **Attendu** : Status 401, message d'erreur

#### ❌ Test 3 : Login avec email inexistant
- Email qui n'existe pas
- **Attendu** : Status 401, message d'erreur

#### ❌ Test 4 : Login sans email
- Pas d'email dans le body
- **Attendu** : Status 400, "Email and password are required"

#### ❌ Test 5 : Login sans mot de passe
- Pas de password dans le body
- **Attendu** : Status 400, "Email and password are required"

---

## Méthode 3 : Test depuis l'application React Native

### Configuration

Assurez-vous que votre `api.ts` utilise la bonne URL :

```typescript
const API_BASE_URL = __DEV__ 
  ? 'http://192.168.1.140:3001/api' 
  : 'https://piol.onrender.com/api';  // ← URL de production
```

### Test dans l'app

1. **Ouvrez votre app** sur un émulateur ou un appareil
2. **Allez sur l'écran de login** (`/auth/login`)
3. **Entrez vos identifiants** :
   - Email : celui que vous avez créé
   - Mot de passe : votre mot de passe
4. **Cliquez sur "Se connecter"**

### Vérifications

#### ✅ Si ça fonctionne :
- Vous êtes redirigé vers l'écran d'accueil
- Le token est sauvegardé dans AsyncStorage
- Les données utilisateur sont affichées

#### ❌ Si ça ne fonctionne pas :

**Vérifiez dans la console** :
- Erreurs réseau
- Erreurs CORS
- Messages d'erreur de l'API

**Erreurs courantes** :

1. **Network request failed**
   - Vérifiez que l'URL est correcte
   - Vérifiez votre connexion internet
   - Vérifiez que le service Render est actif (peut être en veille)

2. **401 Unauthorized**
   - Email ou mot de passe incorrect
   - Utilisateur n'existe pas

3. **CORS Error**
   - Vérifiez la configuration CORS dans le backend

---

## Méthode 4 : Test avec JavaScript (Node.js)

Créez un fichier `test-login.js` :

```javascript
const fetch = require('node-fetch');

const API_URL = 'https://piol.onrender.com/api';

async function testLogin() {
  try {
    // Test health check
    console.log('1️⃣ Test health check...');
    const health = await fetch(`${API_URL}/health`);
    const healthData = await health.json();
    console.log('✅ Health:', healthData);
    
    // Test login
    console.log('\n2️⃣ Test login...');
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@piol.com',
        password: 'Test123456'
      })
    });
    
    const loginData = await loginResponse.json();
    
    if (loginResponse.ok) {
      console.log('✅ Login réussi!');
      console.log('User:', loginData.user.email);
      console.log('Token:', loginData.token.substring(0, 50) + '...');
      
      // Test verify
      console.log('\n3️⃣ Test vérification token...');
      const verifyResponse = await fetch(`${API_URL}/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${loginData.token}`
        }
      });
      const verifyData = await verifyResponse.json();
      console.log('✅ Token valide:', verifyData.message);
    } else {
      console.log('❌ Login échoué:', loginData);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testLogin();
```

Exécutez :
```bash
node test-login.js
```

---

## 🔍 Debugging

### Vérifier les logs Render

1. Allez sur [dashboard.render.com](https://dashboard.render.com)
2. Cliquez sur votre service
3. Allez dans l'onglet **"Logs"**
4. Recherchez les erreurs lors du login

### Erreurs communes

#### "Database connection failed"
- Vérifiez que `DATABASE_URL` est correcte dans Render
- Vérifiez que MongoDB accepte les connexions depuis Render

#### "JWT_SECRET is undefined"
- Vérifiez que `JWT_SECRET` est défini dans les variables d'environnement Render

#### "Cannot read property 'findUnique'"
- Vérifiez que Prisma Client est généré (`npx prisma generate`)
- Vérifiez que le schéma Prisma est poussé (`npx prisma db push`)

---

## ✅ Checklist de test

- [ ] Health check fonctionne (`/api/health`)
- [ ] Utilisateur créé avec succès (`/api/auth/register`)
- [ ] Login réussi avec bons identifiants
- [ ] Login échoue avec mauvais identifiants
- [ ] Token retourné après login
- [ ] Token vérifié avec succès (`/api/auth/verify`)
- [ ] App React Native peut se connecter

---

## 🎯 Exemple complet de test

```bash
# 1. Créer un utilisateur
curl -X POST https://piol.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@piol.com",
    "phone": "+237612345678",
    "password": "Demo123!",
    "firstName": "Demo",
    "lastName": "User",
    "userType": "TENANT"
  }'

# 2. Se connecter
curl -X POST https://piol.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@piol.com",
    "password": "Demo123!"
  }'

# 3. Tester le token (remplacez <TOKEN>)
curl -X GET https://piol.onrender.com/api/auth/verify \
  -H "Authorization: Bearer <TOKEN>"
```

