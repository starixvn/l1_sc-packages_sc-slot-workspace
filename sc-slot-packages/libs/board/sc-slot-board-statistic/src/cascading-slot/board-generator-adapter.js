import { BoardGenerator } from "sc-slot-board-generator";
/**
 * Adapter to wrap sc-slot-board-generator for use in the orchestrator
 */
export class BoardGeneratorAdapter {
    boardGenerator;
    constructor(boardSettings, multiplierConfig, difficulty = 2 /* Difficulty.Medium */) {
        this.boardGenerator = new BoardGenerator(boardSettings, multiplierConfig, null, difficulty);
    }
    /**
     * Generate a new board
     */
    generate() {
        return this.boardGenerator.generate();
    }
    /**
     * Explode and refill board after wins
     */
    explodeAndRefill(board, winSymbols, oldMultipliers) {
        return this.boardGenerator.explodeAndRefill(board, winSymbols, oldMultipliers);
    }
    /**
     * Get the underlying board generator
     */
    getUnderlyingGenerator() {
        return this.boardGenerator;
    }
}
