#!/usr/bin/env ts-node
/**
 * Predefined Results Generator Script
 *
 * This script generates predefined slot game result chains and exports them to files.
 * It supports various configurations and output formats.
 *
 * Usage:
 *   npx ts-node scripts/generate-predefined-results.ts [options]
 *
 * Examples:
 *   # Generate default 120 boards with 97% RTP
 *   npx ts-node scripts/generate-predefined-results.ts
 *
 *   # Generate 200 boards with 95% RTP
 *   npx ts-node scripts/generate-predefined-results.ts --boards 200 --rtp 0.95
 *
 *   # Generate multiple configurations
 *   npx ts-node scripts/generate-predefined-results.ts --batch
 */
import { Difficulty } from '../src/difficulties';
interface GenerationConfig {
    boardCount: number;
    targetRTP: number;
    tolerance: number;
    maxRetries: number;
    outputPath: string;
    rulesFile?: string;
    difficulty: Difficulty;
    description?: string;
}
interface BatchConfig {
    name: string;
    config: GenerationConfig;
}
declare class PredefinedResultsScript {
    private outputDir;
    constructor();
    private ensureOutputDirectory;
    /**
     * Generate a single predefined result chain
     */
    generateChain(config: GenerationConfig): Promise<void>;
    /**
     * Save chain to output file
     */
    private saveChain;
    /**
     * Generate human-readable summary
     */
    private generateSummary;
    /**
     * Generate multiple predefined result sets
     */
    generateBatch(): Promise<void>;
}
export { PredefinedResultsScript, GenerationConfig, BatchConfig };
//# sourceMappingURL=generate-predefined-results.d.ts.map