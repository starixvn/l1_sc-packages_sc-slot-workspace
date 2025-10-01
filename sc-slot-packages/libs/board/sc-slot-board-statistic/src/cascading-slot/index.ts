/**
 * Cascading Slot Module
 * 
 * Main entry point for all cascading slot functionality including
 * result chain generation, statistics, and board management.
 */

// Result Chains Module - Core chain generation and orchestration
export * from './result-chains';

// Statistics and Analysis
export { StatisticCalculator } from './statistic-calculator';
export { StatisticReporter } from './statistic-reporter';
export { StatisticRunner } from './statistic-runner';

// Analyzers Module - Multiplier collection and analysis tools
export * from './analyzers';

// Core Definitions and Configuration
export { commonDefinition, defaultOdds, boardDefinition } from './generator-definition';

// Pattern and Engagement Systems (removed - not used in generate-chains)

// Configuration Systems (removed - not used in generate-chains)

