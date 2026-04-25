export interface SignatureVerificationInput {
    payload: unknown;
    timestamp: string;
    signature: string;
}
export interface SignatureVerifierOptions {
    secret: string;
    algorithm: "sha256";
    maxAgeSeconds: number;
}
export declare class SignatureVerifier {
    private readonly options;
    constructor(options: SignatureVerifierOptions);
    verify(input: SignatureVerificationInput): void;
}
export declare function computeSignatureForTesting(input: {
    secret: string;
    timestamp: string;
    payload: unknown;
}): string;
//# sourceMappingURL=signature.d.ts.map