/**
 * Result Chains Module
 * 
 * This module contains all functionality related to generating, orchestrating, 
 * and managing slot machine result chains with RTP compliance.
 */

// Core orchestration exports
export { ResultChainOrchestrator, ResultChainConfig, ResultChain, BoardGeneratorInterface } from './orchestration/result-chain-orchestrator';
export { RTPController, RTPConfiguration, RTPResult, BoardResult } from './orchestration/rtp-controller';
export { BoardGeneratorAdapter } from './orchestration/board-generator-adapter';
export { createPatternSpecificBoardGeneratorFactory, getPatternConfigSummary, PATTERN_CONFIGS } from './orchestration/custom-generator-configs';

// Enhancement exports
export { BoardEnhancementOrchestrator, EnhancementRequest, EnhancementResult } from './win-booster/board-enhancement-orchestrator';
export { EnhancedBoardAnalyzer, EnhancedBoardAnalysis } from './win-booster/enhanced-board-analyzer';
export { SymbolPrioritizer, SymbolPriorityResult } from './win-booster/symbol-prioritizer';
export { MultiSymbolStrategy, MultiSymbolResult } from './win-booster/multi-symbol-strategy';

// Validation exports
export { ChainValidator } from './validation/chain-validator';

// Script utilities exports
export { 
    BetConfiguration, 
    BET_LEVELS, 
    COIN_VALUES, 
    generateAllBetConfigurations,
    generateUniqueBetAmountConfigurations,
    getUniqueBetAmounts,
    getTotalBetConfigurations, 
    formatBetConfiguration 
} from './scripts/betSettings';
