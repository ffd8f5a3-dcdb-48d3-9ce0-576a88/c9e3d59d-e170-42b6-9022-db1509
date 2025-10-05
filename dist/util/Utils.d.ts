export default class Util {
    wait(ms: number): Promise<void>;
    waitRandom(minMs: number, maxMs: number): Promise<void>;
    getFormattedDate(ms?: number): string;
    shuffleArray<T>(array: T[]): T[];
    randomNumber(min: number, max: number): number;
    chunkArray<T>(arr: T[], numChunks: number): T[][];
    stringToMs(input: string | number): number;
}
//# sourceMappingURL=Utils.d.ts.map