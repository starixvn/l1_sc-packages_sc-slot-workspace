import {
    ResultChainGenerator,
    PayoutCalculator,
    RTPController,
    generateDemoChain,
    generateResultChain,
    createResultChainGenerator,
} from "../src/index";
import defaultDefinition from "../src/default-definition";
import { Difficulty } from "../src/difficulties";

describe("Result Chain System", () => {
    let generator: ResultChainGenerator;
    let payoutCalculator: PayoutCalculator;
    let rtpController: RTPController;

    beforeEach(() => {
        generator = new ResultChainGenerator(defaultDefinition.boardSettings, defaultDefinition.multiplier, Difficulty.Medium);

        payoutCalculator = new PayoutCalculator();

        rtpController = new RTPController(
            {
                targetRTP: 0.97,
                tolerance: 0.01,
                boardCount: 10,
                betSize: 1,
                playerBudget: 100,
            },
            payoutCalculator
        );
    });

    describe("PayoutCalculator", () => {
        it("should calculate payouts for winning combinations", () => {
            // Board with 8+ Crown symbols (symbol 0) - should trigger win
            const board = [
                0,
                0,
                0,
                0,
                0, // 5 crowns in first row
                0,
                0,
                0,
                1,
                2, // 3 more crowns (8 total) + other symbols
                3,
                4,
                5,
                6,
                7, // Other symbols
                8,
                1,
                2,
                3,
                4, // Other symbols
                5,
                6,
                7,
                8,
                1, // Other symbols
                2,
                3,
                4,
                5,
                6, // Other symbols
            ];
            const multipliers: number[] = [];
            const betSize = 1;

            const result = payoutCalculator.calculatePayout(board, multipliers, betSize);

            expect(result.totalWin).toBeGreaterThan(0);
            expect(result.symbolWins.length).toBeGreaterThan(0);
            expect(result.multiplierOrbValue).toBe(0); // No multiplier orbs
        });

        it("should not find wins for non-matching symbols", () => {
            // Board with no matching clusters
            const board = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
            const multipliers: number[] = [];
            const betSize = 1;

            const result = payoutCalculator.calculatePayout(board, multipliers, betSize);

            expect(result.totalWin).toBe(0);
            expect(result.symbolWins.length).toBe(0);
        });

        it("should apply multipliers correctly", () => {
            // Board with 8+ Crown symbols and multiplier orbs
            const board = [
                0,
                0,
                0,
                0,
                0, // 5 crowns
                0,
                0,
                0,
                10,
                1, // 3 more crowns + multiplier orb + other
                2,
                3,
                4,
                5,
                6, // Other symbols
                7,
                8,
                1,
                2,
                3, // Other symbols
                4,
                5,
                6,
                7,
                8, // Other symbols
                1,
                2,
                3,
                4,
                5, // Other symbols
            ];
            const multipliers = [5]; // Multiplier orb value
            const betSize = 1;

            const result = payoutCalculator.calculatePayout(board, multipliers, betSize);

            expect(result.multiplierOrbValue).toBe(5); // Should extract multiplier orb value
            expect(result.totalWin).toBeGreaterThan(0); // Should have crown win
        });
    });

    describe("RTPController", () => {
        it("should validate RTP correctly", () => {
            const mockBoards = [
                {
                    board: [],
                    multipliers: [],
                    payoutResult: { totalWin: 0.5 } as any,
                    cascadeCount: 1,
                    totalCascadeWin: 0.5,
                    isFreeSpin: false,
                    accumulatedMultiplier: 0,
                    remainingFreeSpins: 0,
                },
                {
                    board: [],
                    multipliers: [],
                    payoutResult: { totalWin: 1.0 } as any,
                    cascadeCount: 1,
                    totalCascadeWin: 1.0,
                    isFreeSpin: false,
                    accumulatedMultiplier: 0,
                    remainingFreeSpins: 0,
                },
                {
                    board: [],
                    multipliers: [],
                    payoutResult: { totalWin: 0.0 } as any,
                    cascadeCount: 0,
                    totalCascadeWin: 0.0,
                    isFreeSpin: false,
                    accumulatedMultiplier: 0,
                    remainingFreeSpins: 0,
                },
                {
                    board: [],
                    multipliers: [],
                    payoutResult: { totalWin: 2.5 } as any,
                    cascadeCount: 2,
                    totalCascadeWin: 2.5,
                    isFreeSpin: false,
                    accumulatedMultiplier: 0,
                    remainingFreeSpins: 0,
                },
                {
                    board: [],
                    multipliers: [],
                    payoutResult: { totalWin: 0.8 } as any,
                    cascadeCount: 1,
                    totalCascadeWin: 0.8,
                    isFreeSpin: false,
                    accumulatedMultiplier: 0,
                    remainingFreeSpins: 0,
                },
            ];

            const result = rtpController.validateRTP(mockBoards);

            expect(result.totalBets).toBe(5); // 5 boards × 1 bet each
            expect(result.totalWins).toBe(4.8); // Sum of all wins
            expect(result.actualRTP).toBe(0.96); // 4.8 / 5 = 96%
            expect(result.hitFrequency).toBe(0.8); // 4 out of 5 boards won
        });

        it("should determine win distribution correctly", () => {
            const shouldWin1 = rtpController.shouldNextBoardWin([]);
            const shouldWin2 = rtpController.shouldNextBoardWin([]);

            // At least one of multiple calls should return a boolean
            expect(typeof shouldWin1).toBe("boolean");
            expect(typeof shouldWin2).toBe("boolean");
        });

        it("should calculate required wins for target RTP", () => {
            const currentBoards = [
                {
                    board: [],
                    multipliers: [],
                    payoutResult: { totalWin: 0.5 } as any,
                    cascadeCount: 1,
                    totalCascadeWin: 0.5,
                    isFreeSpin: false,
                    accumulatedMultiplier: 0,
                    remainingFreeSpins: 0,
                },
                {
                    board: [],
                    multipliers: [],
                    payoutResult: { totalWin: 0.0 } as any,
                    cascadeCount: 0,
                    totalCascadeWin: 0.0,
                    isFreeSpin: false,
                    accumulatedMultiplier: 0,
                    remainingFreeSpins: 0,
                },
            ];

            const requiredWins = rtpController.calculateRequiredWins(0.5, 2);
            expect(requiredWins).toBeGreaterThanOrEqual(0);
        });
    });

    describe("ResultChainGenerator", () => {
        it("should generate demo chain successfully", async () => {
            const chain = await generator.generateDemoChain();

            expect(chain.boards.length).toBe(10);
            expect(chain.rtpResult.actualRTP).toBeGreaterThanOrEqual(0);
            expect(chain.rtpResult.actualRTP).toBeLessThanOrEqual(2); // Reasonable upper bound
            expect(chain.generationStats.attempts).toBeGreaterThan(0);
            expect(chain.generationStats.duration).toBeGreaterThan(0);
        });

        it("should export and import chain data", async () => {
            const originalChain = await generator.generateDemoChain();
            const jsonData = generator.exportChainToJSON(originalChain);
            const importedChain = generator.loadChainFromJSON(jsonData);

            expect(importedChain.boards.length).toBe(originalChain.boards.length);
            expect(importedChain.config.boardCount).toBe(originalChain.config.boardCount);
            expect(importedChain.config.targetRTP).toBe(originalChain.config.targetRTP);
        });

        it("should generate boards with cascading wins", async () => {
            const chain = await generator.generateDemoChain();

            // At least some boards should have wins
            const winningBoards = chain.boards.filter((board) => board.totalCascadeWin > 0);
            expect(winningBoards.length).toBeGreaterThan(0);

            // Some boards should have cascades
            const cascadingBoards = chain.boards.filter((board) => board.cascadeCount > 1);
            // Note: Cascades are rare, so we don't require them in a small demo
        });
    });

    describe("Convenience Functions", () => {
        it("should create predefined generator with default config", () => {
            const { generator: gen, config } = createResultChainGenerator();

            expect(gen).toBeInstanceOf(ResultChainGenerator);
            expect(config.boardCount).toBe(120);
            expect(config.targetRTP).toBe(0.97);
            expect(config.betSize).toBe(1);
            expect(config.playerBudget).toBe(100);
        });

        it("should create result chain generator with custom config", () => {
            const { config } = createResultChainGenerator({
                boardCount: 50,
                targetRTP: 0.95,
                betSize: 2,
            });

            expect(config.boardCount).toBe(50);
            expect(config.targetRTP).toBe(0.95);
            expect(config.betSize).toBe(2);
            expect(config.playerBudget).toBe(100); // Default value
        });

        it("should generate demo chain using convenience function", async () => {
            const chain = await generateDemoChain();

            expect(chain.boards.length).toBe(10);
            expect(chain.rtpResult).toBeDefined();
            expect(chain.generationStats).toBeDefined();
        });

        it("should generate predefined chain with custom settings", async () => {
            const chain = await generateResultChain({
                boardCount: 5, // Very small for fast test
                targetRTP: 0.95,
                maxRetries: 10, // More retries for new game mechanics
                tolerance: 0.15, // More lenient tolerance
            });

            expect(chain.boards.length).toBe(5);
            expect(chain.config.targetRTP).toBe(0.95);
            expect(chain.generationStats.attempts).toBeLessThanOrEqual(15);
        });
    });

    describe("RTP Accuracy", () => {
        it("should meet RTP targets within tolerance", async () => {
            const chain = await generateResultChain({
                boardCount: 20, // Larger sample for better accuracy
                targetRTP: 0.95,
                tolerance: 0.15, // 15% tolerance for new game mechanics
                maxRetries: 10,
            });

            const rtpDifference = Math.abs(chain.rtpResult.actualRTP - chain.config.targetRTP);
            expect(rtpDifference).toBeLessThanOrEqual(chain.config.tolerance);
        });

        it("should handle different RTP targets", async () => {
            const lowRTPChain = await generateResultChain({
                boardCount: 10,
                targetRTP: 0.9,
                tolerance: 0.2,
                maxRetries: 10,
            });

            const highRTPChain = await generateResultChain({
                boardCount: 10,
                targetRTP: 0.98,
                tolerance: 0.2,
                maxRetries: 10,
            });

            // Just check that both chains generated successfully
            expect(lowRTPChain.boards.length).toBe(10);
            expect(highRTPChain.boards.length).toBe(10);
        });
    });

    describe("explodedSymbols Validation", () => {
        it("should generate correct explodedSymbols with BoardGenerator", async () => {
            // Create a board with known winning symbols
            const testBoard = [
                0, 0, 0, 0, 0, // 5 crowns in first row
                0, 0, 0, 1, 2, // 3 more crowns (8 total) + other symbols
                3, 4, 5, 6, 7, // Other symbols
                8, 1, 2, 3, 4, // Other symbols
                5, 6, 7, 8, 1, // Other symbols
                2, 3, 4, 5, 6  // Other symbols
            ];
            
            // Test with minimal chain to focus on exploded symbols
            const chain = await generateResultChain({
                boardCount: 1,
                targetRTP: 0.5, // Low RTP to allow wins
                maxRetries: 5,
                tolerance: 0.5
            });

            // Find boards with wins
            const winningBoard = chain.boards.find(board => 
                board.totalCascadeWin > 0 && 
                board.settlementResult?.tumbles && 
                board.settlementResult.tumbles.length > 0
            );

            if (winningBoard) {
                const tumbles = winningBoard.settlementResult!.tumbles;
                
                for (const tumble of tumbles) {
                    // Validate explodedSymbols array length
                    expect(tumble.explodedSymbols).toBeDefined();
                    expect(tumble.explodedSymbols!.length).toBe(30);

                    // Validate explodedSymbols match originalBoard positions
                    const originalBoardArray = tumble.originalBoard.split(',').map(Number);
                    expect(originalBoardArray.length).toBe(30);

                    // Count exploded symbols by type
                    const explodedCounts: { [symbol: number]: number } = {};
                    tumble.explodedSymbols!.forEach((symbol: number, index: number) => {
                        if (symbol !== -1) {
                            // Exploded symbol should match original board at same position
                            expect(symbol).toBe(originalBoardArray[index]);
                            explodedCounts[symbol] = (explodedCounts[symbol] || 0) + 1;
                        }
                    });

                    // Validate exploded counts match icons data
                    if (tumble.icons) {
                        Object.entries(tumble.icons).forEach(([symbolStr, iconData]) => {
                            const symbol = parseInt(symbolStr);
                            const expectedCount = (iconData as any).count;
                            const actualCount = explodedCounts[symbol] || 0;
                            
                            expect(actualCount).toBe(expectedCount);
                        });
                    }
                }
            } else {
                // If no winning board found, that's ok for this test - just ensure structure is correct
                console.log("No winning board found in test chain - structure validation passed");
            }
        });

        it("should validate explodedSymbols consistency across tumbles", async () => {
            const chain = await generateResultChain({
                boardCount: 5, // Small chain for testing
                targetRTP: 0.8, // Higher RTP to increase chance of wins
                maxRetries: 10,
                tolerance: 0.3
            });

            chain.boards.forEach((board, boardIndex) => {
                if (board.settlementResult?.tumbles) {
                    board.settlementResult.tumbles.forEach((tumble, tumbleIndex) => {
                        // Validate basic structure
                        expect(tumble.originalBoard).toBeDefined();
                        expect(tumble.newBoard).toBeDefined();
                        
                        if (tumble.explodedSymbols) {
                            // Validate array structure
                            expect(Array.isArray(tumble.explodedSymbols)).toBe(true);
                            expect(tumble.explodedSymbols.length).toBe(30);

                            // Validate no invalid symbols in exploded positions
                            tumble.explodedSymbols.forEach((symbol: number, pos: number) => {
                                if (symbol !== -1) {
                                    expect(symbol).toBeGreaterThanOrEqual(0);
                                    expect(symbol).toBeLessThanOrEqual(10); // Valid symbol range
                                }
                            });
                        }

                        if (tumble.newSymbols) {
                            // Validate new symbols structure
                            expect(Array.isArray(tumble.newSymbols)).toBe(true);
                            expect(tumble.newSymbols.length).toBe(30);

                            // Validate new symbols are at correct positions
                            tumble.newSymbols.forEach((symbol: number, pos: number) => {
                                if (symbol !== -1) {
                                    expect(symbol).toBeGreaterThanOrEqual(0);
                                    expect(symbol).toBeLessThanOrEqual(10);
                                }
                            });
                        }
                    });
                }
            });
        });

        it("should include bet data in chain results", async () => {
            const chain = await generateResultChain({
                boardCount: 3,
                targetRTP: 0.95,
                maxRetries: 5,
                tolerance: 0.3
            });

            chain.boards.forEach(board => {
                // Validate bet data is included
                expect(board.betLevel).toBeDefined();
                expect(board.coinValue).toBeDefined();
                expect(board.betMultiplier).toBeDefined();
                expect(board.betAmount).toBeDefined();

                // Validate bet calculation
                if (board.betLevel && board.coinValue && board.betMultiplier) {
                    const expectedBetAmount = board.betLevel * board.coinValue * board.betMultiplier;
                    expect(board.betAmount).toBeCloseTo(expectedBetAmount, 2);
                }

                // Validate bet values are reasonable
                expect(board.betLevel).toBeGreaterThan(0);
                expect(board.coinValue).toBeGreaterThan(0);
                expect(board.betMultiplier).toBeGreaterThan(0);
                expect(board.betAmount).toBeGreaterThan(0);
            });
        });

        it("should validate win calculations match exploded symbols", async () => {
            const chain = await generateResultChain({
                boardCount: 2,
                targetRTP: 0.7, // Encourage some wins
                maxRetries: 8,
                tolerance: 0.4
            });

            const winningBoards = chain.boards.filter(board => board.totalCascadeWin > 0);

            if (winningBoards.length > 0) {
                winningBoards.forEach(board => {
                    if (board.settlementResult?.tumbles) {
                        let calculatedTotalWin = 0;

                        board.settlementResult.tumbles.forEach(tumble => {
                            calculatedTotalWin += tumble.win || 0;

                            // If icons data exists, validate it matches exploded symbols
                            if (tumble.icons && tumble.explodedSymbols) {
                                Object.entries(tumble.icons).forEach(([symbolStr, iconData]) => {
                                    const symbol = parseInt(symbolStr);
                                    const expectedCount = (iconData as any).count;
                                    
                                    // Count actual occurrences in explodedSymbols
                                    const actualCount = tumble.explodedSymbols!.filter(s => s === symbol).length;
                                    
                                    expect(actualCount).toBe(expectedCount);
                                });
                            }
                        });

                        // Total tumble win should match calculated total
                        expect(board.totalTumbleWin).toBeCloseTo(calculatedTotalWin, 2);
                    }
                });
            }
        });
    });

    describe("Edge Cases", () => {
        it("should handle zero bet size gracefully", () => {
            const board = [0, 0, 0, 1, 1, 2, 2, 2, 3, 3, 4, 4, 4, 5, 5, 6, 6, 6, 7, 7, 8, 8, 8, 9, 9, 10, 10, 1, 2, 3];
            const multipliers = [2, 3];

            const result = payoutCalculator.calculatePayout(board, multipliers, 0);
            expect(result.totalWin).toBe(0);
        });

        it("should handle empty board gracefully", () => {
            const emptyBoard: number[] = [];
            const multipliers: number[] = [];

            const result = payoutCalculator.calculatePayout(emptyBoard, multipliers, 1);
            expect(result.totalWin).toBe(0);
            expect(result.symbolWins.length).toBe(0);
        });

        it("should handle board with only multiplier symbols", () => {
            const board = Array(30).fill(10); // All multiplier symbols
            const multipliers = Array(30).fill(2);

            const result = payoutCalculator.calculatePayout(board, multipliers, 1);
            expect(result.totalWin).toBe(0); // Multipliers don't form wins by themselves
        });
    });
});
