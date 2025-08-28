import { Chance } from "chance";
import { concat, reduce, repeat } from "ramda";
import { shuffleN } from "./utils";

export interface SymbolPayout {
    from: number;
    to: number;
    odds: number;
}

export interface Symbol {
    symbol: number;
    payout: SymbolPayout[];
}

export default class SymbolsGenerator {
    public static readonly DefaultNormalSymbols: number = 1000;
    public static readonly TotalItemPerReel: number = 200;

    private readonly chance: Chance.Chance;
    private readonly board: number[] = [];
    private readonly numberOfSymbols: Record<number, number>;

    constructor(numberOfSymbols: Record<number, number>, numberOfShuffles = 3) {
        this.chance = new Chance();
        this.numberOfSymbols = numberOfSymbols;

        const board = reduce(
            (result, [key, value]) => concat(result, repeat(Number(key), value)),
            [] as number[],
            Object.entries(this.numberOfSymbols)
        );

        this.board = shuffleN(this.chance.shuffle.bind(this.chance), numberOfShuffles, board);
    }

    randomSymbols(size: number): number[] {
        return this.chance.pickset(this.board, size);
    }

    getBoard(): number[] {
        return this.board;
    }
}
