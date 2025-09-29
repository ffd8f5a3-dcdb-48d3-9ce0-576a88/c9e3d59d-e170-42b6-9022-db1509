export type TotpOptions = {
    digits?: number;
    step?: number;
    algorithm?: 'SHA1' | 'SHA256' | 'SHA512';
};
/**
 * Generate TOTP per RFC 6238.
 * @param secretBase32 - shared secret in Base32
 * @param time - Unix time in seconds (defaults to now)
 * @param options - { digits, step, algorithm }
 * @returns numeric TOTP as string (zero-padded)
 */
export declare function generateTOTP(secretBase32: string, time?: number, options?: TotpOptions): string;
//# sourceMappingURL=Totp.d.ts.map