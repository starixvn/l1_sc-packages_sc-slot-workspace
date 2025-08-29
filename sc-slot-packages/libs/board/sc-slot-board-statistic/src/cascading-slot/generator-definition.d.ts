export declare const commonDefinition: {
    multiplier: {
        symbol: number;
        min: number;
        max: number;
    };
    boardSettings: {
        reels: number;
        symbolsOnReel: number;
        numberOfSymbols: number;
        numberOfShuffles: number;
    };
};
export declare const boardDefinition: {
    mode: {
        [x: number]: {
            0: number;
            1: number;
            2: number;
            3: number;
            4: number;
            5: number;
            6: number;
            7: number;
            8: number;
            9: number;
            10: number;
        };
    };
};
export declare const defaultOdds: {
    normalSymbols: {
        symbol: number;
        payout: {
            from: number;
            to: number;
            odds: number;
        }[];
    }[];
    freeSpins: {
        symbol: number;
        initialOdds: {
            count: number;
            odds: number;
        }[];
        additionalOdds: {
            count: number;
            odds: number;
        }[];
    };
};
//# sourceMappingURL=generator-definition.d.ts.map