# 🚨 Problème de Stockage sur Render

## 📋 Problème Identifié

### ❌ **Symptômes**
- Images uploadées retournent 404 en production
- Erreur: `net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin`
- URLs d'images correctes mais fichiers introuvables

### 🔍 **Cause Racine**
**Render ne persiste pas les fichiers uploadés !**

- Render utilise un système de fichiers **éphémère**
- Les fichiers uploadés sont **supprimés** lors des redémarrages
- Le serveur redémarre automatiquement (déploiements, maintenance, etc.)

## ✅ Corrections CORS Appliquées

### 🔧 **Headers CORS Améliorés**
```javascript
// Middleware pour fichiers statiques
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin'); // ← AJOUTÉ
  res.header('Cache-Control', 'public, max-age=31536000');
  next();
}, express.static(uploadsPath));
```

### 🛡️ **Configuration Helmet Mise à Jour**
```javascript
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "https:", "*"], // ← AJOUTÉ
      "cross-origin-resource-policy": ["cross-origin"] // ← AJOUTÉ
    }
  }
}));
```

## 🚀 Solutions Recommandées

### 1️⃣ **Solution Immédiate : Cloudinary**
```bash
npm install cloudinary multer-storage-cloudinary
```

**Avantages :**
- ✅ Stockage cloud persistant
- ✅ CDN intégré (performances)
- ✅ Transformations d'images automatiques
- ✅ Plan gratuit généreux

### 2️⃣ **Alternative : AWS S3**
```bash
npm install aws-sdk multer-s3
```

### 3️⃣ **Alternative : Google Cloud Storage**
```bash
npm install @google-cloud/storage multer-storage-gcs
```

## 🔧 Implémentation Cloudinary (Recommandée)

### **1. Installation**
```bash
cd piol-backend
npm install cloudinary multer-storage-cloudinary
```

### **2. Configuration**
```javascript
// src/config/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const cloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'piol/properties',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 800, crop: 'limit' }]
  }
});
```

### **3. Variables d'Environnement**
```bash
# .env (Render)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### **4. Modification Upload Route**
```javascript
// src/routes/uploads.ts
import { cloudinaryStorage } from '../config/cloudinary';

const upload = multer({ 
  storage: cloudinaryStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

router.post('/property-image', authenticateToken, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      error: 'No file uploaded',
      message: 'Aucun fichier fourni.'
    });
  }

  // Cloudinary retourne directement l'URL publique
  return res.json({
    message: 'Image uploaded successfully',
    url: req.file.path, // URL Cloudinary
    filename: req.file.filename,
  });
});
```

## ⚡ Solution Temporaire

### **Utiliser des Images de Test**
En attendant l'implémentation Cloudinary, remplacer les URLs d'images par des placeholders :

```javascript
// Dans le frontend
const getImageUrl = (originalUrl) => {
  // Si l'image n'existe pas, utiliser un placeholder
  return originalUrl || 'https://via.placeholder.com/400x300?text=Image+Non+Disponible';
};
```

## 📊 Comparaison Solutions

| Solution | Coût | Complexité | Performances | Recommandé |
|----------|------|------------|--------------|------------|
| **Cloudinary** | Gratuit (10GB) | ⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ **OUI** |
| AWS S3 | ~$0.023/GB | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⚠️ |
| Google Cloud | ~$0.020/GB | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⚠️ |

## 🎯 Prochaines Étapes

1. **Créer un compte Cloudinary** (gratuit)
2. **Configurer les variables d'environnement**
3. **Modifier le code d'upload**
4. **Tester en local puis déployer**
5. **Migrer les images existantes** (optionnel)

---

**Note :** Ce problème est **critique** pour la production. Les images sont essentielles pour une application immobilière !
