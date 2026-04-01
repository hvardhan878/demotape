import CryptoJS from 'crypto-js'

const getSecret = () => {
  const secret = process.env.ENCRYPTION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('ENCRYPTION_SECRET must be at least 32 characters')
  }
  return secret
}

export function encryptApiKey(plaintext: string): string {
  const secret = getSecret()
  return CryptoJS.AES.encrypt(plaintext, secret).toString()
}

export function decryptApiKey(ciphertext: string): string {
  const secret = getSecret()
  const bytes = CryptoJS.AES.decrypt(ciphertext, secret)
  return bytes.toString(CryptoJS.enc.Utf8)
}
