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

// Core Definitions and Configuration
export { commonDefinition, defaultOdds, boardDefinition } from './generator-definition';

// Pattern and Engagement Systems
export { EngagementPatternManager } from './engagement-patterns';
export { FeatureTriggerSystem } from './feature-trigger-system';
export { PatternRTPController } from './pattern-state-machine-rtp-controller';

// Configuration Systems
export * from './configs';

// Test Integration
export { TestIntegration } from './test-integration';
