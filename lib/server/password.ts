import { scrypt as scryptCb, randomBytes, timingSafeEqual } from 'crypto'
import { promisify } from 'util'

const scrypt = promisify(scryptCb)
const keyLength = 64

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('base64url')
  const key = await scrypt(password, salt, keyLength) as Buffer
  return `scrypt$${salt}$${key.toString('base64url')}`
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, salt, hash] = stored.split('$')
  if (scheme !== 'scrypt' || !salt || !hash) return false
  const expected = Buffer.from(hash, 'base64url')
  const actual = await scrypt(password, salt, expected.length) as Buffer
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
