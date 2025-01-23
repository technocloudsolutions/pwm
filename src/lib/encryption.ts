import { hasFeature, BooleanFeatures } from './subscription';
import { User } from 'firebase/auth';
import crypto from 'crypto';

// Basic encryption for free users
const basicEncrypt = (text: string, key: string): string => {
  const cipher = crypto.createCipher('aes-256-cbc', key);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

const basicDecrypt = (encrypted: string, key: string): string => {
  const decipher = crypto.createDecipher('aes-256-cbc', key);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

// Advanced encryption for premium/business users
const advancedEncrypt = (text: string, key: string): string => {
  // Generate a random IV
  const iv = crypto.randomBytes(16);
  
  // Create key buffer from the provided key
  const keyBuffer = crypto.scryptSync(key, 'salt', 32);
  
  // Create cipher with IV
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
  
  // Encrypt the text
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Get the auth tag
  const authTag = cipher.getAuthTag();
  
  // Combine IV, encrypted text, and auth tag
  return iv.toString('hex') + ':' + encrypted + ':' + authTag.toString('hex');
};

const advancedDecrypt = (encrypted: string, key: string): string => {
  // Split the stored data
  const [ivHex, encryptedText, authTagHex] = encrypted.split(':');
  
  // Convert hex strings back to buffers
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  // Create key buffer from the provided key
  const keyBuffer = crypto.scryptSync(key, 'salt', 32);
  
  // Create decipher
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
  decipher.setAuthTag(authTag);
  
  // Decrypt the text
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

export const encryptPassword = async (userId: string, password: string, key: string): Promise<string> => {
  const userObj = { uid: userId } as User;
  const hasAdvanced = await hasFeature(userObj, 'hasAdvancedEncryption' as BooleanFeatures);
  return hasAdvanced ? advancedEncrypt(password, key) : basicEncrypt(password, key);
};

export const decryptPassword = async (userId: string, encrypted: string, key: string): Promise<string> => {
  const userObj = { uid: userId } as User;
  const hasAdvanced = await hasFeature(userObj, 'hasAdvancedEncryption' as BooleanFeatures);
  return hasAdvanced ? advancedDecrypt(encrypted, key) : basicDecrypt(encrypted, key);
};

// Generate a secure encryption key
export const generateEncryptionKey = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

// Hash a password for storage
export const hashPassword = (password: string): string => {
  return crypto.pbkdf2Sync(password, 'salt', 100000, 64, 'sha512').toString('hex');
};

// Verify a password against its hash
export const verifyPassword = (password: string, hash: string): boolean => {
  const newHash = hashPassword(password);
  return newHash === hash;
}; 