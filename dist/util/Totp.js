"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTOTP = generateTOTP;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Decode Base32 (RFC 4648) to a Buffer.
 * Accepts lowercase/uppercase, optional padding.
 */
function base32Decode(input) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const clean = input.toUpperCase().replace(/=+$/g, '').replace(/[^A-Z2-7]/g, '');
    let bits = 0;
    let value = 0;
    const bytes = [];
    for (const char of clean) {
        const idx = alphabet.indexOf(char);
        if (idx < 0)
            continue;
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) {
            bits -= 8;
            bytes.push((value >>> bits) & 0xff);
        }
    }
    return Buffer.from(bytes);
}
/**
 * Generate an HMAC using Node's crypto and return Buffer.
 */
function hmac(algorithm, key, data) {
    return crypto_1.default.createHmac(algorithm, key).update(data).digest();
}
/**
 * Generate TOTP per RFC 6238.
 * @param secretBase32 - shared secret in Base32
 * @param time - Unix time in seconds (defaults to now)
 * @param options - { digits, step, algorithm }
 * @returns numeric TOTP as string (zero-padded)
 */
function generateTOTP(secretBase32, time = Math.floor(Date.now() / 1000), options) {
    const digits = options?.digits ?? 6;
    const step = options?.step ?? 30;
    const alg = (options?.algorithm ?? 'SHA1').toUpperCase();
    const key = base32Decode(secretBase32);
    const counter = Math.floor(time / step);
    // 8-byte big-endian counter
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigUInt64BE(BigInt(counter), 0);
    let hmacAlg;
    if (alg === 'SHA1')
        hmacAlg = 'sha1';
    else if (alg === 'SHA256')
        hmacAlg = 'sha256';
    else if (alg === 'SHA512')
        hmacAlg = 'sha512';
    else
        throw new Error('Unsupported algorithm. Use SHA1, SHA256 or SHA512.');
    const hash = hmac(hmacAlg, key, counterBuffer);
    if (!hash || hash.length < 20) {
        // Minimal sanity check; for SHA1 length is 20
        throw new Error('Invalid HMAC output for TOTP');
    }
    // Dynamic truncation
    const offset = hash[hash.length - 1] & 0x0f;
    if (offset + 3 >= hash.length) {
        throw new Error('Invalid dynamic truncation offset');
    }
    const code = ((hash[offset] & 0x7f) << 24) |
        ((hash[offset + 1] & 0xff) << 16) |
        ((hash[offset + 2] & 0xff) << 8) |
        (hash[offset + 3] & 0xff);
    const otp = (code % 10 ** digits).toString().padStart(digits, '0');
    return otp;
}
//# sourceMappingURL=Totp.js.map