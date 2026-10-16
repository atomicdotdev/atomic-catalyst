/** Atomic CLI hashes use unpadded RFC 4648 Base32; DTO IDs remain hex. */
export function displayChangeHash(hex: string): string {
  if (!/^[a-f0-9]{64}$/i.test(hex)) return hex;
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, value = 0, result = '';
  for (let index = 0; index < hex.length; index += 2) {
    value = (value << 8) | Number.parseInt(hex.slice(index, index + 2), 16);
    bits += 8;
    while (bits >= 5) { bits -= 5; result += alphabet[(value >>> bits) & 31]; }
    value &= (1 << bits) - 1;
  }
  if (bits) result += alphabet[(value << (5 - bits)) & 31];
  return result;
}
