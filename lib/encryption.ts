import CryptoJS from 'crypto-js'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!

if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is required')
}

export function encryptToken(token: string): string {
  return CryptoJS.AES.encrypt(token, ENCRYPTION_KEY).toString()
}

export function decryptToken(encryptedToken: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedToken, ENCRYPTION_KEY)
  return bytes.toString(CryptoJS.enc.Utf8)
}

export function encryptText(text: string): Buffer {
  const encrypted = CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString()
  return Buffer.from(encrypted, 'utf8')
}

export function decryptText(encryptedBuffer: Buffer): string {
  const encryptedString = encryptedBuffer.toString('utf8')
  const bytes = CryptoJS.AES.decrypt(encryptedString, ENCRYPTION_KEY)
  return bytes.toString(CryptoJS.enc.Utf8)
} 