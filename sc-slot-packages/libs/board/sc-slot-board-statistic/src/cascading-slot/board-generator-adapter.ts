import { BoardGenerator, Difficulty } from "sc-slot-board-generator";

/**
 * Adapter to wrap sc-slot-board-generator for use in the orchestrator
 */
export class BoardGeneratorAdapter {
    private boardGenerator: BoardGenerator;

    constructor(
        boardSettings: {
            reels: number;
            symbolsOnReel: number;
            numberOfSymbols: number;
            numberOfShuffles: number;
        },
        multiplierConfig: {
            min: number;
            max: number;
        },
        difficulty: Difficulty = Difficulty.Medium
    ) {
        this.boardGenerator = new BoardGenerator(boardSettings, multiplierConfig, null, difficulty);
    }

    /**
     * Generate a new board
     */
    generate(): { newBoard: number[]; multipliers: number[] } {
        return this.boardGenerator.generate();
    }

    /**
     * Explode and refill board after wins
     */
    explodeAndRefill(board: number[], winSymbols: number[], oldMultipliers: number[]): { 
        newBoard: number[]; 
        multipliers: number[];
        explodedSymbols?: number[];
        newSymbols?: number[];
    } {
        return this.boardGenerator.explodeAndRefill(board, winSymbols, oldMultipliers);
    }

    /**
     * Get the underlying board generator
     */
    getUnderlyingGenerator(): BoardGenerator {
        return this.boardGenerator;
    }
}
