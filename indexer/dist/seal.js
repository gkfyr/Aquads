import nacl from 'tweetnacl';
function hexToBytes(hex) {
    const clean = hex.replace(/^0x/, '');
    return Uint8Array.from(Buffer.from(clean, 'hex'));
}
function bytesToHex(b) {
    return '0x' + Buffer.from(b).toString('hex');
}
export function sign(data) {
    const priv = process.env.SEAL_PRIVATE_KEY_HEX || '';
    if (!priv)
        return '0x';
    const sk = hexToBytes(priv);
    // Expect 64-byte expanded secret or 32-byte seed
    const keypair = sk.length === 64 ? { secretKey: sk } : nacl.sign.keyPair.fromSeed(sk);
    const sig = nacl.sign.detached(data, keypair.secretKey);
    return bytesToHex(sig);
}
export function verify(data, hexSig) {
    const pubHex = process.env.SEAL_PUBLIC_KEY_HEX || '';
    if (!pubHex)
        return true;
    const pk = hexToBytes(pubHex);
    const sig = hexToBytes(hexSig);
    return nacl.sign.detached.verify(data, sig, pk);
}
