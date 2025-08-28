#!/usr/bin/env ts-node
"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.PredefinedResultsScript = void 0;
var fs = require("fs");
var path = require("path");
var commander_1 = require("commander");
var index_1 = require("../src/index");
var default_definition_1 = require("../src/default-definition");
// Helper function to convert difficulty to string
function difficultyToString(difficulty) {
    switch (difficulty) {
        case 1 /* Easy */: return 'Easy';
        case 2 /* Medium */: return 'Medium';
        case 3 /* Hard */: return 'Hard';
        case 4 /* Trial */: return 'Trial';
        default: return 'Medium';
    }
}
var PredefinedResultsScript = /** @class */ (function () {
    function PredefinedResultsScript() {
        this.outputDir = path.join(process.cwd(), 'output');
        this.ensureOutputDirectory();
    }
    PredefinedResultsScript.prototype.ensureOutputDirectory = function () {
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
            console.log("\uD83D\uDCC1 Created output directory: ".concat(this.outputDir));
        }
    };
    /**
     * Generate a single predefined result chain
     */
    PredefinedResultsScript.prototype.generateChain = function (config) {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, generator, customRules, chainConfig, chain, duration, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        startTime = Date.now();
                        console.log("\n\uD83C\uDFB0 Generating Predefined Results Chain");
                        console.log("   Boards: ".concat(config.boardCount));
                        console.log("   Target RTP: ".concat((config.targetRTP * 100).toFixed(1), "%"));
                        console.log("   Tolerance: \u00B1".concat((config.tolerance * 100).toFixed(1), "%"));
                        console.log("   Max Retries: ".concat(config.maxRetries));
                        console.log("   Difficulty: ".concat(difficultyToString(config.difficulty)));
                        if (config.rulesFile) {
                            console.log("   Custom Rules: ".concat(config.rulesFile));
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        generator = void 0;
                        if (config.rulesFile) {
                            console.log("\uD83D\uDCC4 Loading custom rules from ".concat(config.rulesFile, "..."));
                            customRules = index_1.PayoutCalculator.loadPayoutRulesFromFile(config.rulesFile);
                            console.log("   Game Type: ".concat(customRules.gameType));
                            console.log("   Version: ".concat(customRules.version));
                            // Note: Current PredefinedResultGenerator doesn't support custom rules directly
                            // This would require extending the class or modifying it
                            generator = new index_1.PredefinedResultGenerator(default_definition_1["default"].boardSettings, default_definition_1["default"].multiplier, config.difficulty);
                        }
                        else {
                            generator = new index_1.PredefinedResultGenerator(default_definition_1["default"].boardSettings, default_definition_1["default"].multiplier, config.difficulty);
                        }
                        chainConfig = {
                            boardCount: config.boardCount,
                            targetRTP: config.targetRTP,
                            tolerance: config.tolerance,
                            maxRetries: config.maxRetries,
                            betSize: 1,
                            playerBudget: config.boardCount * 1,
                            difficulty: config.difficulty
                        };
                        console.log("\n\u2699\uFE0F  Starting generation...");
                        return [4 /*yield*/, generator.generateChain(chainConfig)];
                    case 2:
                        chain = _a.sent();
                        duration = Date.now() - startTime;
                        // Display results
                        console.log("\n\u2705 Generation Complete!");
                        console.log("   Duration: ".concat((duration / 1000).toFixed(2), "s"));
                        console.log("   Attempts: ".concat(chain.generationStats.attempts));
                        console.log("   Final RTP: ".concat((chain.rtpResult.actualRTP * 100).toFixed(3), "%"));
                        console.log("   Average Win: ".concat(chain.generationStats.averageWin.toFixed(3), "x"));
                        console.log("   Boards Generated: ".concat(chain.boards.length));
                        // Save to file
                        return [4 /*yield*/, this.saveChain(chain, config)];
                    case 3:
                        // Save to file
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        error_1 = _a.sent();
                        console.error("\u274C Generation Failed:", error_1.message);
                        throw error_1;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Save chain to output file
     */
    PredefinedResultsScript.prototype.saveChain = function (chain, config) {
        return __awaiter(this, void 0, void 0, function () {
            var outputPath, output, fileSizeKB, summaryPath, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        outputPath = path.join(this.outputDir, config.outputPath);
                        console.log("\n\uD83D\uDCBE Saving results to ".concat(outputPath, "..."));
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        output = {
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
                                    description: config.description
                                },
                                stats: chain.generationStats,
                                rtpResult: chain.rtpResult
                            },
                            chainConfig: chain.config,
                            boards: chain.boards.map(function (board, index) { return ({
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
                                    freeSpinsAwarded: board.payoutResult.freeSpinsAwarded
                                },
                                isFreeSpin: board.isFreeSpin,
                                accumulatedMultiplier: board.accumulatedMultiplier,
                                remainingFreeSpins: board.remainingFreeSpins
                            }); })
                        };
                        // Save JSON file
                        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
                        fileSizeKB = Math.round(fs.statSync(outputPath).size / 1024);
                        console.log("   File size: ".concat(fileSizeKB, " KB"));
                        console.log("   Boards exported: ".concat(chain.boards.length));
                        summaryPath = outputPath.replace('.json', '-summary.txt');
                        return [4 /*yield*/, this.generateSummary(chain, config, summaryPath)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_2 = _a.sent();
                        console.error("\u274C Failed to save file:", error_2.message);
                        throw error_2;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Generate human-readable summary
     */
    PredefinedResultsScript.prototype.generateSummary = function (chain, config, summaryPath) {
        return __awaiter(this, void 0, void 0, function () {
            var summary;
            return __generator(this, function (_a) {
                summary = [
                    '# Predefined Results Summary',
                    "Generated: ".concat(new Date().toISOString()),
                    '',
                    '## Configuration',
                    "Board Count: ".concat(config.boardCount),
                    "Target RTP: ".concat((config.targetRTP * 100).toFixed(1), "%"),
                    "Tolerance: \u00B1".concat((config.tolerance * 100).toFixed(1), "%"),
                    "Max Retries: ".concat(config.maxRetries),
                    "Difficulty: ".concat(difficultyToString(config.difficulty)),
                    config.rulesFile ? "Custom Rules: ".concat(config.rulesFile) : 'Rules: Default',
                    config.description ? "Description: ".concat(config.description) : '',
                    '',
                    '## Results',
                    "Final RTP: ".concat((chain.rtpResult.actualRTP * 100).toFixed(3), "%"),
                    "Generation Attempts: ".concat(chain.generationStats.attempts),
                    "Average Win: ".concat(chain.generationStats.averageWin.toFixed(3), "x bet"),
                    "Total Boards: ".concat(chain.boards.length),
                    "Meets Target: ".concat(chain.rtpResult.meetsTarget ? 'Yes' : 'No'),
                    '',
                    '## Win Distribution',
                    "Total Bets: ".concat(chain.rtpResult.totalBets),
                    "Total Wins: ".concat(chain.rtpResult.totalWins.toFixed(2)),
                    "Win Variance: ".concat(chain.rtpResult.variance.toFixed(4)),
                    '',
                    '## Board Statistics',
                    "Winning Boards: ".concat(chain.boards.filter(function (b) { return b.totalCascadeWin > 0; }).length),
                    "Free Spin Triggers: ".concat(chain.boards.filter(function (b) { return b.payoutResult.triggersFreeSpin; }).length),
                    "Max Single Win: ".concat(Math.max.apply(Math, chain.boards.map(function (b) { return b.totalCascadeWin; })).toFixed(2), "x"),
                    "Average Cascade Count: ".concat((chain.boards.reduce(function (sum, b) { return sum + b.cascadeCount; }, 0) / chain.boards.length).toFixed(2)),
                    ''
                ].join('\n');
                fs.writeFileSync(summaryPath, summary);
                console.log("   Summary saved: ".concat(path.basename(summaryPath)));
                return [2 /*return*/];
            });
        });
    };
    /**
     * Generate multiple predefined result sets
     */
    PredefinedResultsScript.prototype.generateBatch = function () {
        return __awaiter(this, void 0, void 0, function () {
            var batchConfigs, i, batch, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        batchConfigs = [
                            {
                                name: 'Standard 97% RTP',
                                config: {
                                    boardCount: 120,
                                    targetRTP: 0.97,
                                    tolerance: 0.01,
                                    maxRetries: 10,
                                    outputPath: 'standard-97-rtp.json',
                                    difficulty: 2 /* Medium */,
                                    description: 'Standard configuration with 97% RTP for balanced gameplay'
                                }
                            },
                            {
                                name: 'High RTP 98%',
                                config: {
                                    boardCount: 100,
                                    targetRTP: 0.98,
                                    tolerance: 0.01,
                                    maxRetries: 15,
                                    outputPath: 'high-rtp-98.json',
                                    difficulty: 1 /* Easy */,
                                    description: 'High RTP configuration for player-friendly gameplay'
                                }
                            },
                            {
                                name: 'Conservative 95% RTP',
                                config: {
                                    boardCount: 150,
                                    targetRTP: 0.95,
                                    tolerance: 0.015,
                                    maxRetries: 10,
                                    outputPath: 'conservative-95-rtp.json',
                                    difficulty: 3 /* Hard */,
                                    description: 'Conservative RTP with higher variance and longer gameplay'
                                }
                            },
                            {
                                name: 'Extended Session 200 Boards',
                                config: {
                                    boardCount: 200,
                                    targetRTP: 0.965,
                                    tolerance: 0.02,
                                    maxRetries: 20,
                                    outputPath: 'extended-session-200.json',
                                    difficulty: 2 /* Medium */,
                                    description: 'Extended gameplay session with 200 boards for longer engagement'
                                }
                            },
                            {
                                name: 'Quick Demo 50 Boards',
                                config: {
                                    boardCount: 50,
                                    targetRTP: 0.97,
                                    tolerance: 0.05,
                                    maxRetries: 5,
                                    outputPath: 'quick-demo-50.json',
                                    difficulty: 1 /* Easy */,
                                    description: 'Quick demonstration with 50 boards for testing and demos'
                                }
                            }
                        ];
                        console.log("\n\uD83D\uDD04 Starting Batch Generation - ".concat(batchConfigs.length, " configurations\n"));
                        i = 0;
                        _a.label = 1;
                    case 1:
                        if (!(i < batchConfigs.length)) return [3 /*break*/, 6];
                        batch = batchConfigs[i];
                        console.log("\n[".concat(i + 1, "/").concat(batchConfigs.length, "] ").concat(batch.name));
                        console.log('='.repeat(50));
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.generateChain(batch.config)];
                    case 3:
                        _a.sent();
                        console.log("\u2705 ".concat(batch.name, " completed successfully"));
                        return [3 /*break*/, 5];
                    case 4:
                        error_3 = _a.sent();
                        console.error("\u274C ".concat(batch.name, " failed:"), error_3.message);
                        return [3 /*break*/, 5];
                    case 5:
                        i++;
                        return [3 /*break*/, 1];
                    case 6:
                        console.log("\n\uD83C\uDF89 Batch generation complete! Check the output directory:");
                        console.log("   ".concat(this.outputDir));
                        return [2 /*return*/];
                }
            });
        });
    };
    return PredefinedResultsScript;
}());
exports.PredefinedResultsScript = PredefinedResultsScript;
// CLI Setup
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var program, options, script, difficulty, config, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    program = new commander_1.Command();
                    program
                        .name('generate-predefined-results')
                        .description('Generate predefined slot game result chains')
                        .version('1.0.0');
                    program
                        .option('-b, --boards <number>', 'Number of boards to generate', '120')
                        .option('-r, --rtp <number>', 'Target RTP (0.0-1.0)', '0.97')
                        .option('-t, --tolerance <number>', 'RTP tolerance', '0.01')
                        .option('-m, --max-retries <number>', 'Maximum generation retries', '10')
                        .option('-o, --output <path>', 'Output file path (relative to output/)', 'predefined-results.json')
                        .option('-R, --rules <path>', 'Custom rules JSON file')
                        .option('-d, --difficulty <level>', 'Difficulty level (Easy, Medium, Hard)', 'Medium')
                        .option('-D, --description <text>', 'Description for the generated chain')
                        .option('--batch', 'Generate multiple predefined configurations')
                        .option('--dry-run', 'Show configuration without generating');
                    program.parse();
                    options = program.opts();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 6, , 7]);
                    script = new PredefinedResultsScript();
                    if (!options.batch) return [3 /*break*/, 3];
                    return [4 /*yield*/, script.generateBatch()];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 3:
                    difficulty = void 0;
                    switch (options.difficulty.toLowerCase()) {
                        case 'easy':
                            difficulty = 1 /* Easy */;
                            break;
                        case 'hard':
                            difficulty = 3 /* Hard */;
                            break;
                        default:
                            difficulty = 2 /* Medium */;
                            break;
                    }
                    config = {
                        boardCount: parseInt(options.boards),
                        targetRTP: parseFloat(options.rtp),
                        tolerance: parseFloat(options.tolerance),
                        maxRetries: parseInt(options.maxRetries),
                        outputPath: options.output,
                        rulesFile: options.rules,
                        difficulty: difficulty,
                        description: options.description
                    };
                    // Validate configuration
                    if (config.targetRTP < 0 || config.targetRTP > 1) {
                        throw new Error('Target RTP must be between 0.0 and 1.0');
                    }
                    if (config.boardCount < 1 || config.boardCount > 1000) {
                        throw new Error('Board count must be between 1 and 1000');
                    }
                    if (options.dryRun) {
                        console.log('🧪 Dry Run - Configuration:');
                        console.log(JSON.stringify(config, null, 2));
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, script.generateChain(config)];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5: return [3 /*break*/, 7];
                case 6:
                    error_4 = _a.sent();
                    console.error('❌ Script failed:', error_4.message);
                    process.exit(1);
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
}
// Run if called directly
if (require.main === module) {
    main()["catch"](function (error) {
        console.error('💥 Unexpected error:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=generate-predefined-results.js.map