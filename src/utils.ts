// src/utils.ts
export async function verifyGitHubSignature(
  body: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature) return false;
  
  const parts = signature.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') return false;
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signed = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(body)
  );
  
  const computed = Array.from(new Uint8Array(signed))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  const expected = parts[1];
  if (computed.length !== expected.length) return false;
  
  let result = 0;
  for (let i = 0; i < computed.length; i++) {
    result |= computed.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  
  return result === 0;
}

export function fillTemplate(template: string, data: Record<string, string>): string {
  return template.replace(/{(\w+)}/g, (match, key) => data[key] || match);
}