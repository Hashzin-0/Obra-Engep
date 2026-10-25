const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || 'mailto:contato@example.com';

if (!publicKey || !privateKey) {
  console.error('Defina VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY (base64url).');
  process.exit(1);
}

function b64UrlToBytes(value) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

const importedPublic = await crypto.subtle.importKey(
  'raw',
  b64UrlToBytes(publicKey),
  { name: 'ECDSA', namedCurve: 'P-256' },
  true,
  ['verify']
);
const publicJwk = await crypto.subtle.exportKey('jwk', importedPublic);

const privateJwk = {
  kty: 'EC',
  crv: 'P-256',
  d: privateKey,
  x: publicJwk.x,
  y: publicJwk.y,
};
const importedPrivate = await crypto.subtle.importKey(
  'jwk',
  privateJwk,
  { name: 'ECDSA', namedCurve: 'P-256' },
  true,
  ['sign']
);
const normalizedPrivate = await crypto.subtle.exportKey('jwk', importedPrivate);

console.log(JSON.stringify({
  VAPID_SUBJECT: subject,
  VAPID_KEYS: JSON.stringify({
    publicKey: publicJwk,
    privateKey: normalizedPrivate,
  }),
}));
