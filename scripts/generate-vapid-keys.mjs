const keyPair = await crypto.subtle.generateKey(
  { name: 'ECDSA', namedCurve: 'P-256' },
  true,
  ['sign', 'verify']
);

const exported = {
  publicKey: await crypto.subtle.exportKey('jwk', keyPair.publicKey),
  privateKey: await crypto.subtle.exportKey('jwk', keyPair.privateKey),
};

console.log(JSON.stringify(exported));
