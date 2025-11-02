"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidEmail = isValidEmail;
exports.isValidCameroonPhone = isValidCameroonPhone;
exports.isStrongPassword = isStrongPassword;
exports.isValidCoordinates = isValidCoordinates;
exports.isValidPrice = isValidPrice;
exports.sanitizeString = sanitizeString;
exports.isValidImageFile = isValidImageFile;
exports.isValidFileSize = isValidFileSize;
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
function isValidCameroonPhone(phone) {
    const phoneRegex = /^(\+237)?[62]\d{8}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
}
function isStrongPassword(password) {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
}
function isValidCoordinates(lat, lng) {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}
function isValidPrice(price) {
    return price > 0 && price <= 10000000;
}
function sanitizeString(str) {
    return str.trim().replace(/[<>]/g, '');
}
function isValidImageFile(filename) {
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return allowedExtensions.includes(extension);
}
function isValidFileSize(size, maxSizeMB = 5) {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return size <= maxSizeBytes;
}
//# sourceMappingURL=validation.js.map