/**
 * PIN hashing with PBKDF2. This is a privacy curtain for the screen, not
 * encryption: the data in IndexedDB is readable by anyone with the unlocked
 * device and developer tools.
 */
const ITERATIONS = 150_000

const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)))
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

async function derive(pin: string, salt: Uint8Array<ArrayBuffer>): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, key, 256)
}

export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return `v1:${b64(salt)}:${b64(await derive(pin, salt))}`
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [v, salt, hash] = stored.split(':')
  if (v !== 'v1' || !salt || !hash) return false
  const got = b64(await derive(pin, unb64(salt)))
  // Constant-time-ish compare; timing is not a realistic threat here but it costs nothing.
  let diff = got.length ^ hash.length
  for (let i = 0; i < Math.min(got.length, hash.length); i++) diff |= got.charCodeAt(i) ^ hash.charCodeAt(i)
  return diff === 0
}

export const isValidPin = (pin: string) => /^\d{4,8}$/.test(pin)
