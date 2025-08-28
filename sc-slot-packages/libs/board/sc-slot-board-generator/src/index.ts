import { BoardGenerator } from "./board-generator";
import { Difficulty } from "./difficulties";
import {
    PayoutCalculator,
    PayoutRule,
    SymbolWin,
    ScatterWin,
    PayoutResult,
    PayoutRulesConfig,
    SymbolPayoutConfig,
    ScatterPayoutConfig,
    MultiplierOrbConfig,
    PayoutTier,
} from "./payout-calculator";
import { RTPController, RTPConfiguration, RTPResult, BoardResult, WinDistribution } from "./result-chain/rtp-controller";
import { ResultChainGenerator, ResultChainConfig, ResultChain, CascadeSequence } from "./result-chain/result-chain-generator";
import defaultDefinition from "./default-definition";

// Core board generation
export { BoardGenerator, Difficulty };

// Payout system
export {
    PayoutCalculator,
    PayoutRule,
    SymbolWin,
    ScatterWin,
    PayoutResult,
    PayoutRulesConfig,
    SymbolPayoutConfig,
    ScatterPayoutConfig,
    MultiplierOrbConfig,
    PayoutTier,
};

// RTP management
export { RTPController, RTPConfiguration, RTPResult, BoardResult, WinDistribution };

// Result chain generation
export { ResultChainGenerator, ResultChainConfig, ResultChain, CascadeSequence };

/**
 * Convenience factory function to create a result chain generator
 * with default settings
 */
export function createResultChainGenerator(config?: Partial<ResultChainConfig>) {
    const generator = new ResultChainGenerator(defaultDefinition.boardSettings, defaultDefinition.multiplier, Difficulty.Medium);

    return {
        generator,
        config: {
            boardCount: 120,
            targetRTP: 0.97,
            betSize: 1,
            playerBudget: 100,
            difficulty: Difficulty.Medium,
            maxRetries: 10,
            tolerance: 0.01,
            ...config,
        } as ResultChainConfig,
    };
}

/**
 * Quick function to generate a result chain with default settings
 */
export async function generateResultChain(config?: Partial<ResultChainConfig>): Promise<ResultChain> {
    const { generator, config: finalConfig } = createResultChainGenerator(config);
    return generator.generateChain(finalConfig);
}

/**
 * Demo function that generates a small chain for testing
 */
export async function generateDemoChain(): Promise<ResultChain> {
    const { generator } = createResultChainGenerator();
    return generator.generateDemoChain();
}
