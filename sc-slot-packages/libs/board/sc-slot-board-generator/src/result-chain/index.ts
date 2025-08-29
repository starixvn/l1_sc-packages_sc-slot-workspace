// Export existing result chain components
export * from './result-chain-generator';

// Export simplified result chain generator (RTP control moved to sc-slot-board-statistic)
export { SimpleResultChainGenerator, SimpleBoardResult } from './simple-result-chain-generator';

// Legacy exports (deprecated - use sc-slot-board-statistic for RTP control)
export * from './rtp-controller';
export * from './enhanced-result-chain-generator';
