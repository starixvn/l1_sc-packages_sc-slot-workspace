export interface Round {
    id?: number;
    freeSpinId?: number;
    totalAmount?: number;
    betwin?: number;
    freeSpin?: boolean;
    coinValue?: number;
    betLevel?: number;
    betMultiplier?: number;
    multiplier?: number;
    odds?: any;
    totalTumbleWin?: number;
    settlementResult?: {
        tumbles: {
            icons: Record<string, {
                count: number;
                odds: number;
            }>;
            win: number;
            originalBoard: string;
            newBoard: string;
            multipliers: number[];
        }[];
        freeSpins: {
            count: number;
            odds: number;
        };
        additionalFreeSpins: {
            count: number;
            odds: number;
        };
    };
}
export interface Statistic {
    totalRounds: number;
    winingRounds: number;
    totalBetAmount: number;
    totalPayout: number;
    totalPayoutForFreeSpins: number;
    totalFreeSpins: number;
    totalAdditionFreeSpins: number;
    totalMultipliers: number;
    rtp: number;
    winFreeSpins: number;
    multipliers: Record<number, number>;
    round: {
        maximumTumbles: number;
        maximumPayout: number;
        maximumFreeSpins: number;
        maximumMultiplier: number;
        maximumTumblePayout: number;
    };
    symbols: {
        counts: Record<number, Record<number, number>>;
    };
    cache: any;
}
export declare const calculateCommonProperties: (round: Round) => (statistic: Statistic) => Statistic;
export declare const calculateRoundProperty: (round: Round) => (statistic: Statistic) => Statistic;
export declare const countWinningSymbols: (round: Round) => (statistic: Statistic) => Statistic;
export declare const countMultiplierValues: (round: Round) => (statistic: Statistic) => Statistic;
export declare const calculateStatistic: (round: Round) => (statistic: Statistic) => Statistic;
export declare const variance: (input: number[]) => number;
export declare const getValues: (properties: string[], statistics: Statistic[]) => number[];
export declare const getPercents: (properties: string[], statistics: Statistic[], size: number) => number[];
export declare const calculateRTP: (statistics: Statistic[], rounds: number) => {
    rtp: number;
    rtpDeviation: number;
    multiplierRatio: number;
    freeSpinsRatio: number;
    tumbleWinRatio: number;
};
export declare const countSymbols: (statistics: Statistic[]) => Record<number, Record<number, number>>;
export declare const countMultipliers: (statistics: Statistic[]) => Record<number, number>;
//# sourceMappingURL=statistic-calculator.d.ts.map