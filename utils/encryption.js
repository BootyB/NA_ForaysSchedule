const crypto = require('crypto');
require('dotenv').config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 32 bytes (64 hex chars)

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes). Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
}

const algorithm = 'aes-256-gcm';
const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');

function encrypt(text) {
  if (!text) return null;
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(encryptedData) {
  if (!encryptedData) return null;
  
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

function encryptJSON(obj) {
  if (!obj) return null;
  return encrypt(JSON.stringify(obj));
}

function decryptJSON(encryptedJSON) {
  if (!encryptedJSON) return null;
  try {
    const decrypted = decrypt(encryptedJSON);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Error decrypting JSON:', error.message, 'Data:', encryptedJSON?.substring(0, 50));
    return null;
  }
}

module.exports = {
  encrypt,
  decrypt,
  encryptJSON,
  decryptJSON
};
