import { BoardGenerator } from "sc-slot-board-generator";
import { boardDefinition } from "./generator-definition.js";
/**
 * Adapter to wrap sc-slot-board-generator for use in the orchestrator
 */
export class BoardGeneratorAdapter {
    boardGenerator;
    constructor(boardSettings, multiplierConfig, difficulty = 2 /* Difficulty.Medium */) {
        // Use our local board definition with enhanced scatter symbol distribution
        // Pass the complete boardDefinition object (which contains the mode property)
        this.boardGenerator = new BoardGenerator(boardSettings, multiplierConfig, boardDefinition, difficulty);
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
    /**
     * Get board settings for external integration
     */
    getBoardSettings() {
        return {
            reels: 6,
            symbolsOnReel: 5,
            numberOfSymbols: 11,
            numberOfShuffles: 3,
        };
    }
}
