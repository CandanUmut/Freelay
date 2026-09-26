/**
 * Face ID / Touch ID as a local gate via WebAuthn platform authenticators.
 * There is no server to verify the signature, so this only proves the OS
 * accepted the user's biometric. Like the PIN, it is a curtain, not encryption.
 */
const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)))
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

export async function biometricAvailable(): Promise<boolean> {
  try {
    return Boolean(window.PublicKeyCredential) && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
  } catch {
    return false
  }
}

export async function registerBiometric(): Promise<string> {
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: 'Ledger' },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'ledger', displayName: 'Ledger' },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null
  if (!cred) throw new Error('No credential created')
  return b64(cred.rawId)
}

export async function verifyBiometric(credId: string): Promise<boolean> {
  try {
    const got = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ type: 'public-key', id: unb64(credId) }],
        userVerification: 'required',
        timeout: 60_000,
      },
    })
    return Boolean(got)
  } catch {
    return false
  }
}
