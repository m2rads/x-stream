import CryptoJS from 'crypto-js'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production'

export function encryptToken(token: string): string {
  return CryptoJS.AES.encrypt(token, ENCRYPTION_KEY).toString()
}

export function decryptToken(encryptedToken: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedToken, ENCRYPTION_KEY)
  return bytes.toString(CryptoJS.enc.Utf8)
} 