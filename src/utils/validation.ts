// Utilitaires de validation

// Validation d'email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validation de numéro de téléphone camerounais
export function isValidCameroonPhone(phone: string): boolean {
  // Format accepté: +237XXXXXXXXX ou 6XXXXXXXX ou 2XXXXXXXX
  const phoneRegex = /^(\+237)?[62]\d{8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

// Validation de mot de passe fort
export function isStrongPassword(password: string): boolean {
  // Au moins 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}

// Validation de coordonnées GPS
export function isValidCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

// Validation de prix
export function isValidPrice(price: number): boolean {
  return price > 0 && price <= 10000000; // Max 10M FCFA
}

// Sanitization de chaîne de caractères
export function sanitizeString(str: string): string {
  return str.trim().replace(/[<>]/g, '');
}

// Validation de fichier image
export function isValidImageFile(filename: string): boolean {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return allowedExtensions.includes(extension);
}

// Validation de taille de fichier (en bytes)
export function isValidFileSize(size: number, maxSizeMB: number = 5): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return size <= maxSizeBytes;
}
