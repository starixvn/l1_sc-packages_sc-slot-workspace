#!/usr/bin/env ts-node

/**
 * Result Chain Generator Script
 *
 * This script generates result chains for slot games and exports them to files.
 * It supports various configurations and output formats.
 *
 * Usage:
 *   npx ts-node scripts/generate-result-chain.ts [options]
 *
 * Examples:
 *   # Generate default 120 boards with 97% RTP
 *   npx ts-node scripts/generate-result-chain.ts
 *
 *   # Generate 200 boards with 95% RTP
 *   npx ts-node scripts/generate-result-chain.ts --boards 200 --rtp 0.95
 *
 *   # Generate multiple configurations
 *   npx ts-node scripts/generate-result-chain.ts --batch
 */

import * as fs from "fs";
import * as path from "path";
import { Command } from "commander";
import { ResultChainGenerator, PayoutCalculator, ResultChainConfig, PayoutRulesConfig } from "../src/index";
import defaultDefinition from "../src/default-definition";
import { Difficulty } from "../src/difficulties";

// Helper function to convert difficulty to string
function difficultyToString(difficulty: Difficulty): string {
    switch (difficulty) {
        case Difficulty.Easy:
            return "Easy";
        case Difficulty.Medium:
            return "Medium";
        case Difficulty.Hard:
            return "Hard";
        case Difficulty.Trial:
            return "Trial";
        default:
            return "Medium";
    }
}

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

class PredefinedResultsScript {
    private outputDir: string;

    constructor() {
        this.outputDir = path.join(process.cwd(), "output");
        this.ensureOutputDirectory();
    }

    private ensureOutputDirectory(): void {
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
            console.log(`📁 Created output directory: ${this.outputDir}`);
        }
    }

    /**
     * Generate a single predefined result chain
     */
    async generateChain(config: GenerationConfig): Promise<void> {
        const startTime = Date.now();

        console.log(`\n🎰 Generating Predefined Results Chain`);
        console.log(`   Boards: ${config.boardCount}`);
        console.log(`   Target RTP: ${(config.targetRTP * 100).toFixed(1)}%`);
        console.log(`   Tolerance: ±${(config.tolerance * 100).toFixed(1)}%`);
        console.log(`   Max Retries: ${config.maxRetries}`);
        console.log(`   Difficulty: ${difficultyToString(config.difficulty)}`);

        if (config.rulesFile) {
            console.log(`   Custom Rules: ${config.rulesFile}`);
        }

        try {
            // Create generator with custom rules if specified
            let generator: ResultChainGenerator;

            if (config.rulesFile) {
                console.log(`📄 Loading custom rules from ${config.rulesFile}...`);
                const customRules = PayoutCalculator.loadPayoutRulesFromFile(config.rulesFile);
                console.log(`   Game Type: ${customRules.gameType}`);
                console.log(`   Version: ${customRules.version}`);

                // Note: Current ResultChainGenerator doesn't support custom rules directly
                // This would require extending the class or modifying it
                generator = new ResultChainGenerator(defaultDefinition.boardSettings, defaultDefinition.multiplier, config.difficulty);
            } else {
                generator = new ResultChainGenerator(defaultDefinition.boardSettings, defaultDefinition.multiplier, config.difficulty);
            }

            // Configure chain generation
            const chainConfig: ResultChainConfig = {
                boardCount: config.boardCount,
                targetRTP: config.targetRTP,
                tolerance: config.tolerance,
                maxRetries: config.maxRetries,
                betSize: 1,
                playerBudget: config.boardCount * 1, // Budget = boards * bet size
                difficulty: config.difficulty,
            };

            console.log(`\n⚙️  Starting generation...`);

            // Generate the chain
            const chain = await generator.generateChain(chainConfig);

            const duration = Date.now() - startTime;

            // Display results
            console.log(`\n✅ Generation Complete!`);
            console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);
            console.log(`   Attempts: ${chain.generationStats.attempts}`);
            console.log(`   Final RTP: ${(chain.rtpResult.actualRTP * 100).toFixed(3)}%`);
            console.log(`   Average Win: ${chain.generationStats.averageWin.toFixed(3)}x`);
            console.log(`   Boards Generated: ${chain.boards.length}`);

            // Save to file
            await this.saveChain(chain, config);
        } catch (error) {
            console.error(`❌ Generation Failed:`, error.message);
            throw error;
        }
    }

    /**
     * Save chain to output file
     */
    private async saveChain(chain: any, config: GenerationConfig): Promise<void> {
        const outputPath = path.join(this.outputDir, config.outputPath);

        console.log(`\n💾 Saving results to ${outputPath}...`);

        try {
            // Create enhanced output with metadata
            const output = {
                metadata: {
                    generatedAt: new Date().toISOString(),
                    generatorVersion: "1.0.0",
                    config: {
                        boardCount: config.boardCount,
                        targetRTP: config.targetRTP,
                        tolerance: config.tolerance,
                        maxRetries: config.maxRetries,
                        difficulty: difficultyToString(config.difficulty),
                        rulesFile: config.rulesFile,
                        description: config.description,
                    },
                    stats: chain.generationStats,
                    rtpResult: chain.rtpResult,
                },
                chainConfig: chain.config,
                boards: chain.boards.map((board: any, index: number) => ({
                    boardIndex: index,
                    board: board.board,
                    multipliers: board.multipliers,
                    cascadeCount: board.cascadeCount,
                    totalCascadeWin: board.totalCascadeWin,
                    payoutResult: {
                        totalWin: board.payoutResult.totalWin,
                        symbolWins: board.payoutResult.symbolWins,
                        scatterWin: board.payoutResult.scatterWin,
                        winningSymbols: board.payoutResult.winningSymbols,
                        multiplierOrbValue: board.payoutResult.multiplierOrbValue,
                        triggersFreeSpin: board.payoutResult.triggersFreeSpin,
                        freeSpinsAwarded: board.payoutResult.freeSpinsAwarded,
                    },
                    isFreeSpin: board.isFreeSpin,
                    accumulatedMultiplier: board.accumulatedMultiplier,
                    remainingFreeSpins: board.remainingFreeSpins,
                })),
            };

            // Save JSON file
            fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

            const fileSizeKB = Math.round(fs.statSync(outputPath).size / 1024);
            console.log(`   File size: ${fileSizeKB} KB`);
            console.log(`   Boards exported: ${chain.boards.length}`);

            // Generate summary file
            const summaryPath = outputPath.replace(".json", "-summary.txt");
            await this.generateSummary(chain, config, summaryPath);
        } catch (error) {
            console.error(`❌ Failed to save file:`, error.message);
            throw error;
        }
    }

    /**
     * Generate human-readable summary
     */
    private async generateSummary(chain: any, config: GenerationConfig, summaryPath: string): Promise<void> {
        const summary = [
            "# Predefined Results Summary",
            `Generated: ${new Date().toISOString()}`,
            "",
            "## Configuration",
            `Board Count: ${config.boardCount}`,
            `Target RTP: ${(config.targetRTP * 100).toFixed(1)}%`,
            `Tolerance: ±${(config.tolerance * 100).toFixed(1)}%`,
            `Max Retries: ${config.maxRetries}`,
            `Difficulty: ${difficultyToString(config.difficulty)}`,
            config.rulesFile ? `Custom Rules: ${config.rulesFile}` : "Rules: Default",
            config.description ? `Description: ${config.description}` : "",
            "",
            "## Results",
            `Final RTP: ${(chain.rtpResult.actualRTP * 100).toFixed(3)}%`,
            `Generation Attempts: ${chain.generationStats.attempts}`,
            `Average Win: ${chain.generationStats.averageWin.toFixed(3)}x bet`,
            `Total Boards: ${chain.boards.length}`,
            `Meets Target: ${chain.rtpResult.meetsTarget ? "Yes" : "No"}`,
            "",
            "## Win Distribution",
            `Total Bets: ${chain.rtpResult.totalBets}`,
            `Total Wins: ${chain.rtpResult.totalWins.toFixed(2)}`,
            `Win Variance: ${chain.rtpResult.variance.toFixed(4)}`,
            "",
            "## Board Statistics",
            `Winning Boards: ${chain.boards.filter((b: any) => b.totalCascadeWin > 0).length}`,
            `Free Spin Triggers: ${chain.boards.filter((b: any) => b.payoutResult.triggersFreeSpin).length}`,
            `Max Single Win: ${Math.max(...chain.boards.map((b: any) => b.totalCascadeWin)).toFixed(2)}x`,
            `Average Cascade Count: ${(chain.boards.reduce((sum: number, b: any) => sum + b.cascadeCount, 0) / chain.boards.length).toFixed(2)}`,
            "",
        ].join("\n");

        fs.writeFileSync(summaryPath, summary);
        console.log(`   Summary saved: ${path.basename(summaryPath)}`);
    }

    /**
     * Generate multiple predefined result sets
     */
    async generateBatch(): Promise<void> {
        const batchConfigs: BatchConfig[] = [
            {
                name: "Standard 97% RTP",
                config: {
                    boardCount: 120,
                    targetRTP: 0.97,
                    tolerance: 0.01,
                    maxRetries: 10,
                    outputPath: "standard-97-rtp.json",
                    difficulty: Difficulty.Medium,
                    description: "Standard configuration with 97% RTP for balanced gameplay",
                },
            },
            {
                name: "High RTP 98%",
                config: {
                    boardCount: 100,
                    targetRTP: 0.98,
                    tolerance: 0.01,
                    maxRetries: 15,
                    outputPath: "high-rtp-98.json",
                    difficulty: Difficulty.Easy,
                    description: "High RTP configuration for player-friendly gameplay",
                },
            },
            {
                name: "Conservative 95% RTP",
                config: {
                    boardCount: 150,
                    targetRTP: 0.95,
                    tolerance: 0.015,
                    maxRetries: 10,
                    outputPath: "conservative-95-rtp.json",
                    difficulty: Difficulty.Hard,
                    description: "Conservative RTP with higher variance and longer gameplay",
                },
            },
            {
                name: "Extended Session 200 Boards",
                config: {
                    boardCount: 200,
                    targetRTP: 0.965,
                    tolerance: 0.02,
                    maxRetries: 20,
                    outputPath: "extended-session-200.json",
                    difficulty: Difficulty.Medium,
                    description: "Extended gameplay session with 200 boards for longer engagement",
                },
            },
            {
                name: "Quick Demo 50 Boards",
                config: {
                    boardCount: 50,
                    targetRTP: 0.97,
                    tolerance: 0.05,
                    maxRetries: 5,
                    outputPath: "quick-demo-50.json",
                    difficulty: Difficulty.Easy,
                    description: "Quick demonstration with 50 boards for testing and demos",
                },
            },
        ];

        console.log(`\n🔄 Starting Batch Generation - ${batchConfigs.length} configurations\n`);

        for (let i = 0; i < batchConfigs.length; i++) {
            const batch = batchConfigs[i];
            console.log(`\n[${i + 1}/${batchConfigs.length}] ${batch.name}`);
            console.log("=".repeat(50));

            try {
                await this.generateChain(batch.config);
                console.log(`✅ ${batch.name} completed successfully`);
            } catch (error) {
                console.error(`❌ ${batch.name} failed:`, error.message);
                // Continue with next configuration
            }
        }

        console.log(`\n🎉 Batch generation complete! Check the output directory:`);
        console.log(`   ${this.outputDir}`);
    }
}

// CLI Setup
async function main() {
    const program = new Command();

    program.name("generate-predefined-results").description("Generate predefined slot game result chains").version("1.0.0");

    program
        .option("-b, --boards <number>", "Number of boards to generate", "120")
        .option("-r, --rtp <number>", "Target RTP (0.0-1.0)", "0.97")
        .option("-t, --tolerance <number>", "RTP tolerance", "0.01")
        .option("-m, --max-retries <number>", "Maximum generation retries", "10")
        .option("-o, --output <path>", "Output file path (relative to output/)", "result-chain.json")
        .option("-R, --rules <path>", "Custom rules JSON file")
        .option("-d, --difficulty <level>", "Difficulty level (Easy, Medium, Hard)", "Medium")
        .option("-D, --description <text>", "Description for the generated chain")
        .option("--batch", "Generate multiple predefined configurations")
        .option("--dry-run", "Show configuration without generating");

    program.parse();

    const options = program.opts();

    try {
        const script = new PredefinedResultsScript();

        if (options.batch) {
            await script.generateBatch();
        } else {
            // Parse difficulty
            let difficulty: Difficulty;
            switch (options.difficulty.toLowerCase()) {
                case "easy":
                    difficulty = Difficulty.Easy;
                    break;
                case "hard":
                    difficulty = Difficulty.Hard;
                    break;
                default:
                    difficulty = Difficulty.Medium;
                    break;
            }

            const config: GenerationConfig = {
                boardCount: parseInt(options.boards),
                targetRTP: parseFloat(options.rtp),
                tolerance: parseFloat(options.tolerance),
                maxRetries: parseInt(options.maxRetries),
                outputPath: options.output,
                rulesFile: options.rules,
                difficulty,
                description: options.description,
            };

            // Validate configuration
            if (config.targetRTP < 0 || config.targetRTP > 1) {
                throw new Error("Target RTP must be between 0.0 and 1.0");
            }

            if (config.boardCount < 1 || config.boardCount > 1000) {
                throw new Error("Board count must be between 1 and 1000");
            }

            if (options.dryRun) {
                console.log("🧪 Dry Run - Configuration:");
                console.log(JSON.stringify(config, null, 2));
                return;
            }

            await script.generateChain(config);
        }
    } catch (error) {
        console.error("❌ Script failed:", error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch((error) => {
        console.error("💥 Unexpected error:", error);
        process.exit(1);
    });
}

export { PredefinedResultsScript, GenerationConfig, BatchConfig };
