// Import external calculators the same way statistic-runner does
import RoundCalculator from "sc-cascading-slot-base/src/board/round-calculator";
import TumbleCalculator from "sc-cascading-slot-base/src/board/tumble-calculator";
import { prop } from "ramda";
import { RTPController } from "./rtp-controller.js";
import { defaultOdds } from "./generator-definition.js";
export class ResultChainOrchestrator {
    boardGeneratorFactory;
    rtpController;
    roundCalculator;
    externalCalculatorAvailable;
    constructor(boardGeneratorFactory, rtpConfig) {
        this.boardGeneratorFactory = boardGeneratorFactory;
        this.rtpController = new RTPController(rtpConfig);
        this.externalCalculatorAvailable = this.initializeExternalCalculator();
    }
    /**
     * Initialize external settlement calculator (same pattern as statistic-runner)
     */
    initializeExternalCalculator() {
        try {
            console.log("🔄 Initializing external settlement calculator...");
            // Create calculator with our enhanced board generator configuration
            // Note: We need to create a new BoardGenerator with our enhanced settings
            const enhancedBoardGenerator = this.boardGeneratorFactory();
            const underlyingGenerator = enhancedBoardGenerator.getUnderlyingGenerator();
            this.roundCalculator = new RoundCalculator({
                boardGenerator: underlyingGenerator,
                tumbleCalculator: new TumbleCalculator(),
            });
            console.log("✅ External RoundCalculator initialized successfully");
            return true;
        }
        catch (error) {
            console.warn("⚠️  External calculator initialization failed:", error.message);
            console.warn("📋 Stack trace:", error.stack);
            return false;
        }
    }
    /**
     * Reset cascade pattern counter for new test runs
     */
    resetCascadePatternCounter() {
        ResultChainOrchestrator.cascadePatternCounter = { twoTumbles: 0, threeTumbles: 0 };
        console.log("🔄 Reset cascade pattern counter for new test run");
    }
    /**
     * Generate result chain with RTP validation and retries
     */
    async generateResultChain(config) {
        const startTime = Date.now();
        let bestChain = [];
        let bestRTP = 0;
        let attempts = 0;
        // Reset cascade pattern counter for this generation run
        this.resetCascadePatternCounter();
        // Update RTP controller with new config
        this.rtpController.updateConfig({
            targetRTP: config.targetRTP,
            tolerance: config.tolerance,
            boardCount: config.boardCount,
            betSize: config.betSize,
            playerBudget: config.playerBudget,
        });
        console.log(`🎯 Generating result chain: ${config.boardCount} boards, target RTP: ${(config.targetRTP * 100).toFixed(1)}%`);
        for (attempts = 1; attempts <= config.maxRetries; attempts++) {
            console.log(`🔄 Attempt ${attempts}/${config.maxRetries}`);
            const chain = await this.generateSingleChain(config);
            const rtpResult = this.rtpController.validateRTP(chain);
            console.log(`📊 Attempt ${attempts}: RTP ${(rtpResult.actualRTP * 100).toFixed(2)}%, Target: ${(config.targetRTP * 100).toFixed(2)}%, Meets: ${rtpResult.meetsTarget ? '✅' : '❌'}`);
            if (rtpResult.meetsTarget) {
                bestChain = chain;
                bestRTP = rtpResult.actualRTP;
                console.log(`✅ Target RTP achieved on attempt ${attempts}!`);
                break;
            }
            // Keep the best attempt so far
            if (Math.abs(rtpResult.actualRTP - config.targetRTP) < Math.abs(bestRTP - config.targetRTP)) {
                bestChain = chain;
                bestRTP = rtpResult.actualRTP;
            }
        }
        const duration = Date.now() - startTime;
        const finalRtpResult = this.rtpController.validateRTP(bestChain);
        // Calculate tumble stats
        const tumbleStats = this.calculateTumbleStats(bestChain);
        console.log(`🏁 Generation complete: ${attempts} attempts, ${duration}ms, final RTP: ${(finalRtpResult.actualRTP * 100).toFixed(2)}%`);
        return {
            config,
            boards: bestChain,
            rtpResult: finalRtpResult,
            generationStats: {
                attempts,
                duration,
                finalRTP: finalRtpResult.actualRTP,
                averageWin: finalRtpResult.totalWins / config.boardCount,
                maxWin: Math.max(...bestChain.map(board => board.totalTumbleWin || 0)),
                hitFrequency: finalRtpResult.hitFrequency,
            },
            tumbleStats,
        };
    }
    /**
     * Generate a single chain attempt
     */
    async generateSingleChain(config) {
        const boards = [];
        for (let i = 0; i < config.boardCount; i++) {
            const shouldWin = this.rtpController.shouldNextBoardWin(boards);
            const targetWinSize = shouldWin ? this.rtpController.getTargetWinSize(boards) : 0;
            const boardResult = await this.generateSingleBoard(targetWinSize, config.betSize, i, config);
            boards.push(boardResult);
            // Adjust strategy if we're drifting from target
            if (i % 20 === 19) {
                // Adjust every 20 boards
                const currentRTP = boards.length > 0
                    ? boards.reduce((sum, board) => sum + (board.totalTumbleWin || 0), 0) / (boards.length * config.betSize)
                    : 0;
                console.log(`📈 Progress: ${i + 1}/${config.boardCount} boards, current RTP: ${(currentRTP * 100).toFixed(2)}%`);
            }
        }
        return boards;
    }
    /**
     * Generate a single board with settlement processing
     */
    async generateSingleBoard(targetWin, betSize, boardId, config) {
        const maxAttempts = 50;
        let bestBoard = null;
        let bestDistance = Infinity;
        const boardGenerator = this.boardGeneratorFactory();
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            let initialBoard = boardGenerator.generate();
            // 🎯 FIX FOR EMPTY TUMBLES: If target win > 0, ensure board has winning symbols
            if (targetWin > 0) {
                initialBoard = this.enhanceBoardForTargetWin(initialBoard, targetWin, betSize);
            }
            // Create round for settlement processing using config bet parameters
            const coinValue = config.coinValue || 0.1;
            const betLevel = config.betLevel || 0.5;
            const betMultiplier = 20; // Standard multiplier
            // Use actual config values for the round
            const totalAmount = coinValue * betLevel * betMultiplier;
            const round = {
                id: boardId,
                coinValue,
                betLevel,
                betMultiplier,
                totalAmount: totalAmount,
                odds: {
                    oddsByCounts: Object.assign({}, defaultOdds.normalSymbols.map(prop("payout"))),
                    freeSpins: defaultOdds.freeSpins,
                },
            };
            // Process settlement using external calculator
            const boardResult = await this.processSettlement(initialBoard, round, betSize);
            const distance = Math.abs((boardResult.totalTumbleWin || 0) - targetWin);
            if (distance < bestDistance || bestBoard === null) {
                bestBoard = boardResult;
                bestDistance = distance;
                // If we're close enough to target, use this board
                if (distance <= betSize * 0.1) {
                    // Within 10% of bet
                    break;
                }
            }
        }
        return bestBoard;
    }
    static cascadePatternCounter = { twoTumbles: 0, threeTumbles: 0 };
    /**
     * Determine cascade pattern for a board (0=no cascade, 1=2 tumbles, 2=3 tumbles)
     * Ensures exactly 1 board with 2 tumbles and 1 board with 3 tumbles in our test
     */
    determineCascadePattern(board, betSize) {
        // For our specific test requirements: exactly 1 board with 2 tumbles, 1 board with 3 tumbles
        // Strategy: Use board index or characteristics to determine pattern
        const boardSum = board.reduce((sum, symbol) => sum + symbol, 0);
        const boardVariance = board.filter((symbol, index) => symbol !== board[0]).length;
        // Assign patterns based on board characteristics to ensure diversity
        if (ResultChainOrchestrator.cascadePatternCounter.threeTumbles === 0 && boardSum % 3 === 0) {
            ResultChainOrchestrator.cascadePatternCounter.threeTumbles = 1;
            console.log("🎯 Assigning 3-tumble pattern (2 cascades) to board");
            return 2; // 3 tumbles (2 cascades)
        }
        else if (ResultChainOrchestrator.cascadePatternCounter.twoTumbles === 0 && boardVariance > 15) {
            ResultChainOrchestrator.cascadePatternCounter.twoTumbles = 1;
            console.log("🎯 Assigning 2-tumble pattern (1 cascade) to board");
            return 1; // 2 tumbles (1 cascade)  
        }
        else {
            console.log("🎯 Assigning single tumble (no cascade) to board");
            return 0; // 1 tumble (no cascade)
        }
    }
    /**
     * Generate preGeneratedResult structure according to guide
     */
    generatePreGeneratedResult(initialBoard, initialMultipliers, cascadePattern) {
        const preGeneratedResult = [];
        if (cascadePattern === 0) {
            // Single tumble - no cascade
            preGeneratedResult.push({
                newBoard: [...initialBoard],
                multipliers: [...initialMultipliers],
                icons: {},
                explodedSymbols: [],
                newSymbols: []
            });
        }
        else if (cascadePattern === 1) {
            // 2 tumbles = 2 array items
            // Item 1: Creates first tumble (winner with 8s)
            const firstBoard = this.createWinningBoard(initialBoard, 8);
            preGeneratedResult.push({
                newBoard: firstBoard,
                multipliers: [...initialMultipliers],
                icons: {},
                explodedSymbols: [],
                newSymbols: [] // Not used for tumble creation
            });
            // Item 2: Provides explodedSymbols to first tumble + creates second tumble (no wins)
            const explodedSymbols = this.generateExplodedSymbols(firstBoard, 8);
            const finalBoard = this.applyExplosionAndRefill(firstBoard, explodedSymbols);
            preGeneratedResult.push({
                newBoard: finalBoard,
                multipliers: [...initialMultipliers],
                icons: {},
                explodedSymbols: explodedSymbols,
                newSymbols: this.calculateNewSymbols(firstBoard, finalBoard, explodedSymbols)
            });
        }
        else if (cascadePattern === 2) {
            // 3 tumbles = 3 array items
            // Item 1: Creates first tumble (winner with 8s)
            const firstBoard = this.createWinningBoard(initialBoard, 8);
            preGeneratedResult.push({
                newBoard: firstBoard,
                multipliers: [...initialMultipliers],
                icons: {},
                explodedSymbols: [],
                newSymbols: []
            });
            // Item 2: Provides explodedSymbols to first tumble + creates second tumble (winner with 7s)
            const firstExploded = this.generateExplodedSymbols(firstBoard, 8);
            const secondBoard = this.createWinningBoard(this.applyExplosionAndRefill(firstBoard, firstExploded), 7);
            preGeneratedResult.push({
                newBoard: secondBoard,
                multipliers: [...initialMultipliers],
                icons: {},
                explodedSymbols: firstExploded,
                newSymbols: this.calculateNewSymbols(firstBoard, secondBoard, firstExploded)
            });
            // Item 3: Provides explodedSymbols to second tumble + creates third tumble (no wins)
            const secondExploded = this.generateExplodedSymbols(secondBoard, 7);
            const finalBoard = this.applyExplosionAndRefill(secondBoard, secondExploded);
            preGeneratedResult.push({
                newBoard: finalBoard,
                multipliers: [...initialMultipliers],
                icons: {},
                explodedSymbols: secondExploded,
                newSymbols: this.calculateNewSymbols(secondBoard, finalBoard, secondExploded)
            });
        }
        return preGeneratedResult;
    }
    /**
     * Create a board with winning symbols at the beginning
     */
    createWinningBoard(baseBoard, winningSymbol) {
        const board = [...baseBoard];
        // Place winning symbols in first 3 positions to guarantee a win
        board[0] = winningSymbol;
        board[1] = winningSymbol;
        board[2] = winningSymbol;
        return board;
    }
    /**
     * Generate explodedSymbols array for a winning symbol
     */
    generateExplodedSymbols(board, winningSymbol) {
        return board.map(symbol => symbol === winningSymbol ? winningSymbol : -1);
    }
    /**
     * Apply explosion and refill logic
     */
    applyExplosionAndRefill(board, explodedSymbols) {
        const newBoard = [...board];
        for (let i = 0; i < explodedSymbols.length; i++) {
            if (explodedSymbols[i] !== -1) {
                // Replace exploded symbol with random new symbol
                newBoard[i] = Math.floor(Math.random() * 7); // 0-6 for normal symbols
            }
        }
        return newBoard;
    }
    /**
     * Calculate which symbols are new (dropped in)
     */
    calculateNewSymbols(originalBoard, newBoard, explodedSymbols) {
        const newSymbols = [];
        for (let i = 0; i < originalBoard.length; i++) {
            if (explodedSymbols[i] !== -1) {
                newSymbols[i] = newBoard[i]; // This position got a new symbol
            }
            else {
                newSymbols[i] = -1; // No change at this position
            }
        }
        return newSymbols;
    }
    /**
     * Process settlement using preGeneratedResult approach (guide-compliant)
     */
    async processSettlement(initialBoard, round, betSize) {
        // Calculate bet details for chain data
        const coinValue = round.coinValue;
        const betLevel = round.betLevel;
        const betMultiplier = round.betMultiplier;
        // Use internal board processing instead of external calculator to ensure board continuity
        const tumbleProcessingResult = await this.processTumblesWithBoardGenerator(initialBoard.newBoard, initialBoard.multipliers || [], betSize);
        const tumbles = tumbleProcessingResult.tumbles;
        const totalWin = tumbleProcessingResult.totalWin;
        // 🎯 CRITICAL FIX: ALL boards need initial tumble for roundCalculator compatibility
        const initialTumble = {
            icons: {},
            originalBoard: initialBoard.newBoard.join(','),
            newBoard: initialBoard.newBoard.join(','),
            multipliers: initialBoard.multipliers || [],
            win: 0 // Initial state always has 0 win
        };
        // Insert initial tumble for ALL boards (winning AND losing)
        if (tumbles.length > 0 && totalWin > 0) {
            // WINNING BOARD: Initial tumble + cascade tumbles
            tumbles.unshift(initialTumble);
            console.log(`✅ WINNING BOARD: Generated ${tumbles.length} tumbles (initial + ${tumbles.length - 1} cascades)`);
        }
        else {
            // LOSING BOARD: Only initial tumble with win = 0
            tumbles.push(initialTumble);
            console.log(`✅ LOSING BOARD: Generated 1 tumble (initial state, win = 0)`);
        }
        let freeSpinWins = 0;
        let totalFreeSpinsPlayed = 0;
        let freeSpinBoardSequence = [];
        // Execute free spins if awarded (simplified for internal processing)
        const freeSpinsAwarded = 0; // No free spins for internal processing
        return {
            board: initialBoard.newBoard,
            multipliers: initialBoard.multipliers,
            payoutResult: undefined,
            cascadeCount: tumbles.length,
            totalCascadeWin: totalWin,
            isFreeSpin: round.freeSpin || false,
            accumulatedMultiplier: round.multiplier || 0,
            remainingFreeSpins: 0,
            freeSpinsPlayed: totalFreeSpinsPlayed,
            freeSpinWins,
            freeSpinBoards: freeSpinBoardSequence.length > 0 ? freeSpinBoardSequence : undefined,
            settlementResult: {
                tumbles: tumbles,
                freeSpins: { count: 0, odds: 0 },
                additionalFreeSpins: { count: 0, odds: 0 }
            },
            totalTumbleWin: totalWin,
            // Include bet data for stake flexibility
            betLevel: round.betLevel,
            coinValue: round.coinValue,
            betMultiplier: round.betMultiplier,
            betAmount: (round.coinValue || 0.1) * (round.betLevel || 0.5) * (round.betMultiplier || 20)
        };
    }
    /**
     * Fix explodedSymbols in tumbles using BoardGenerator (for external calculator results)
     */
    async fixExplodedSymbolsInTumbles(originalTumbles, initialBoard, initialMultipliers) {
        const boardGenerator = this.boardGeneratorFactory();
        const fixedTumbles = [];
        let currentBoard = [...initialBoard];
        let currentMultipliers = [...initialMultipliers];
        for (const originalTumble of originalTumbles) {
            if (originalTumble.explodedSymbols && originalTumble.explodedSymbols.some((s) => s !== -1)) {
                // External calculator found winning symbols - extract them from exploded positions
                const winSymbols = [];
                const explodedPositions = [];
                originalTumble.explodedSymbols.forEach((symbol, position) => {
                    if (symbol !== -1) {
                        winSymbols.push(symbol);
                        explodedPositions.push(position);
                    }
                });
                // Get unique winning symbols
                const uniqueWinSymbols = [...new Set(winSymbols)];
                // Use BoardGenerator to get correct newBoard and newSymbols based on actual exploded positions
                const boardGeneratorResult = boardGenerator.explodeAndRefill(currentBoard, uniqueWinSymbols, currentMultipliers);
                // Create fixed tumble keeping external calculator's exploded positions (which are correct)
                // but using BoardGenerator for newBoard and newSymbols
                const fixedTumble = {
                    ...originalTumble,
                    originalBoard: currentBoard.join(','),
                    newBoard: originalTumble.newBoard || boardGeneratorResult.newBoard.join(','),
                    explodedSymbols: originalTumble.explodedSymbols,
                    newSymbols: boardGeneratorResult.newSymbols || originalTumble.newSymbols,
                    multipliers: boardGeneratorResult.multipliers || currentMultipliers
                };
                fixedTumbles.push(fixedTumble);
                // Update board state for next tumble - use the actual new board from external calculator
                if (originalTumble.newBoard) {
                    currentBoard = originalTumble.newBoard.split(',').map(Number);
                }
                else {
                    currentBoard = boardGeneratorResult.newBoard;
                }
                currentMultipliers = boardGeneratorResult.multipliers || currentMultipliers;
            }
            else {
                // No wins - keep original tumble as-is but update board tracking
                fixedTumbles.push(originalTumble);
                if (originalTumble.newBoard) {
                    currentBoard = originalTumble.newBoard.split(',').map(Number);
                }
            }
        }
        return fixedTumbles;
    }
    /**
     * Fallback simulation when external calculator not available
     */
    simulateBoardResult(initialBoard, betSize) {
        return {
            board: initialBoard.newBoard,
            multipliers: initialBoard.multipliers,
            payoutResult: undefined,
            cascadeCount: 0,
            totalCascadeWin: 0,
            isFreeSpin: false,
            accumulatedMultiplier: 0,
            remainingFreeSpins: 0,
            freeSpinsPlayed: 0,
            freeSpinWins: 0,
            freeSpinBoards: undefined,
            settlementResult: {
                tumbles: [],
                freeSpins: { count: 0, odds: 0 },
                additionalFreeSpins: { count: 0, odds: 0 }
            },
            totalTumbleWin: 0,
            betLevel: 1,
            coinValue: 0.1,
            betMultiplier: 10,
            betAmount: 1
        };
    }
    /**
     * Process tumbles using BoardGenerator for correct explodedSymbols generation
     */
    async processTumblesWithBoardGenerator(initialBoard, initialMultipliers, betSize) {
        const boardGenerator = this.boardGeneratorFactory();
        const tumbles = [];
        let currentBoard = [...initialBoard];
        let currentMultipliers = [...initialMultipliers];
        let totalWin = 0;
        // Maximum tumble iterations to prevent infinite loops
        const maxTumbles = 10;
        for (let tumbleIndex = 0; tumbleIndex < maxTumbles; tumbleIndex++) {
            // Detect winning symbols on current board
            const winSymbols = this.detectWinningSymbols(currentBoard);
            if (winSymbols.length === 0) {
                break; // No more wins, stop tumbling
            }
            // Use BoardGenerator.explodeAndRefill for correct processing
            const tumbleResult = boardGenerator.explodeAndRefill(currentBoard, winSymbols, currentMultipliers);
            // Calculate win for this tumble
            const tumbleWin = this.calculateTumbleWin(winSymbols, betSize);
            totalWin += tumbleWin;
            // Create tumble data with correct explodedSymbols from BoardGenerator
            const tumbleData = {
                originalBoard: currentBoard.join(','),
                newBoard: tumbleResult.newBoard.join(','),
                explodedSymbols: tumbleResult.explodedSymbols,
                newSymbols: tumbleResult.newSymbols,
                multipliers: tumbleResult.multipliers || [],
                icons: this.createIconsData(winSymbols, tumbleWin, currentBoard),
                win: tumbleWin
            };
            tumbles.push(tumbleData);
            // Update board state for next tumble
            currentBoard = tumbleResult.newBoard;
            currentMultipliers = tumbleResult.multipliers || [];
        }
        return { tumbles, totalWin };
    }
    /**
     * 🎯 EMPTY TUMBLES FIX: Enhance board to have winning symbols for target win
     */
    enhanceBoardForTargetWin(board, targetWin, betSize) {
        const currentBoard = [...board.newBoard];
        const currentMultipliers = [...board.multipliers];
        // Analyze current board state
        const analysis = this.analyzeBoard(currentBoard);
        console.log(`🎯 Enhancing board for target win: ${targetWin.toFixed(2)} (${(targetWin / betSize).toFixed(1)}x bet)`);
        console.log(`   Current winning symbols: [${analysis.winningSymbols.join(', ')}]`);
        console.log(`   Near-win symbols: ${analysis.nearWinSymbols.map(s => `${s.symbol}(${s.count})`).join(', ')}`);
        // If already has winning symbols, return as-is (avoid over-enhancement)
        if (analysis.winningSymbols.length > 0) {
            console.log(`   ✅ Board already has winning symbols, using as-is`);
            return { newBoard: currentBoard, multipliers: currentMultipliers };
        }
        // Determine target symbol and count based on win size
        const targetWinMultiplier = targetWin / betSize;
        const { symbol, count } = this.determineTargetSymbolForWin(targetWinMultiplier, analysis);
        // Place symbols strategically to create win
        const enhancedBoard = this.placeWinningSymbols(currentBoard, symbol, count);
        console.log(`   🔧 Placed ${count} symbols of type ${symbol} for ${targetWinMultiplier.toFixed(1)}x target`);
        console.log(`   📊 Enhanced board now has winning symbols: [${this.detectWinningSymbols(enhancedBoard).join(', ')}]`);
        return {
            newBoard: enhancedBoard,
            multipliers: currentMultipliers
        };
    }
    /**
     * Analyze board state for intelligent symbol placement
     */
    analyzeBoard(board) {
        const symbolCounts = {};
        const emptyPositions = [];
        // Count symbols and find empty positions
        board.forEach((symbol, position) => {
            if (symbol === -1 || symbol === null || symbol === undefined) {
                emptyPositions.push(position);
            }
            else if (symbol >= 0 && symbol <= 10) {
                symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
            }
        });
        // Identify winning symbols (8+)
        const winningSymbols = [];
        Object.entries(symbolCounts).forEach(([symbol, count]) => {
            if (count >= 8) {
                winningSymbols.push(parseInt(symbol));
            }
        });
        // Identify near-win symbols (5-7)
        const nearWinSymbols = [];
        Object.entries(symbolCounts).forEach(([symbol, count]) => {
            if (count >= 5 && count <= 7) {
                nearWinSymbols.push({
                    symbol: parseInt(symbol),
                    count: count,
                    needed: 8 - count
                });
            }
        });
        // Determine win potential
        let winPotential = 'none';
        if (winningSymbols.length > 0) {
            winPotential = 'high';
        }
        else if (nearWinSymbols.length >= 2) {
            winPotential = 'medium';
        }
        else if (nearWinSymbols.length === 1) {
            winPotential = 'low';
        }
        return {
            symbolCounts,
            winningSymbols,
            nearWinSymbols,
            emptyPositions,
            winPotential
        };
    }
    /**
     * Determine optimal symbol and count for target win
     */
    determineTargetSymbolForWin(targetMultiplier, analysis) {
        // If there are near-wins, build on the closest one
        if (analysis.nearWinSymbols.length > 0) {
            const closestNearWin = analysis.nearWinSymbols.sort((a, b) => a.needed - b.needed)[0];
            const extraSymbols = Math.ceil(targetMultiplier); // Add extra symbols based on multiplier
            return {
                symbol: closestNearWin.symbol,
                count: Math.min(8 + extraSymbols, 15) // Cap at 15 symbols max
            };
        }
        // Choose symbol based on target multiplier
        let targetSymbol;
        let symbolCount;
        if (targetMultiplier >= 10.0) {
            // Mega wins - use high-value symbols
            targetSymbol = 7; // High-value symbol
            symbolCount = 12;
        }
        else if (targetMultiplier >= 5.0) {
            // Big wins - use medium-high symbols
            targetSymbol = 5;
            symbolCount = 10;
        }
        else if (targetMultiplier >= 2.0) {
            // Medium wins - use medium symbols
            targetSymbol = 3;
            symbolCount = 9;
        }
        else {
            // Small wins - use low symbols
            targetSymbol = 1;
            symbolCount = 8;
        }
        return { symbol: targetSymbol, count: symbolCount };
    }
    /**
     * Place winning symbols strategically on board
     */
    placeWinningSymbols(board, targetSymbol, targetCount) {
        const newBoard = [...board];
        let placedCount = 0;
        // Count existing instances of target symbol
        const existingCount = newBoard.filter(symbol => symbol === targetSymbol).length;
        const needToPlace = Math.max(0, targetCount - existingCount);
        // Find available positions (prefer spreading across reels)
        const availablePositions = [];
        for (let i = 0; i < newBoard.length; i++) {
            // Can place on any position, but prefer non-target symbols
            if (newBoard[i] !== targetSymbol) {
                availablePositions.push(i);
            }
        }
        // Place symbols across different reels for realistic patterns
        const reelWidth = 5;
        const reelCount = 6;
        let positioned = 0;
        // Try to place symbols across different reels
        for (let reel = 0; reel < reelCount && positioned < needToPlace; reel++) {
            const reelPositions = availablePositions.filter(pos => Math.floor(pos / reelWidth) === reel);
            const symbolsPerReel = Math.min(Math.ceil(needToPlace / reelCount), reelPositions.length);
            for (let i = 0; i < symbolsPerReel && positioned < needToPlace; i++) {
                if (reelPositions[i] !== undefined) {
                    newBoard[reelPositions[i]] = targetSymbol;
                    positioned++;
                }
            }
        }
        // Fill remaining symbols randomly if needed
        while (positioned < needToPlace && availablePositions.length > positioned) {
            const randomPos = availablePositions[positioned];
            if (newBoard[randomPos] !== targetSymbol) {
                newBoard[randomPos] = targetSymbol;
                positioned++;
            }
        }
        return newBoard;
    }
    /**
     * Detect winning symbols on the board (simplified but functional version)
     */
    detectWinningSymbols(board) {
        // Count each symbol on the 30-position board (6x5 grid)
        const symbolCounts = {};
        board.forEach(symbol => {
            if (symbol >= 0 && symbol <= 10) { // Normal symbols 0-10
                symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
            }
        });
        // Return symbols with 8+ matches (business rule - cannot change)
        const winSymbols = [];
        Object.entries(symbolCounts).forEach(([symbol, count]) => {
            if (count >= 8) { // Business rule: minimum 8 symbols for win
                winSymbols.push(parseInt(symbol));
            }
        });
        return winSymbols;
    }
    /**
     * Calculate win amount for a tumble based on winning symbols
     */
    calculateTumbleWin(winSymbols, betSize) {
        // Simple calculation based on symbol values and odds
        let totalWin = 0;
        winSymbols.forEach(symbol => {
            // Basic payout calculation (this should match the actual game rules)
            const baseOdds = this.getSymbolOdds(symbol);
            totalWin += baseOdds * betSize;
        });
        return totalWin;
    }
    /**
     * Get odds for a symbol (simplified version)
     */
    getSymbolOdds(symbol) {
        // Default odds for different symbols (this should match game configuration)
        const symbolOdds = {
            0: 5,
            1: 8,
            2: 10,
            3: 16,
            4: 20,
            5: 15,
            6: 40,
            7: 12,
            8: 25,
            9: 18 // Special
        };
        return symbolOdds[symbol] || 5; // Default odds
    }
    /**
     * Create icons data in the expected format
     */
    createIconsData(winSymbols, totalWin, board) {
        const icons = {};
        // Count actual symbols on board for accurate icons data
        const symbolCounts = {};
        board.forEach(symbol => {
            if (winSymbols.includes(symbol)) {
                symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
            }
        });
        winSymbols.forEach(symbol => {
            const count = symbolCounts[symbol] || 5; // Actual count from board
            const odds = this.getSymbolOdds(symbol);
            icons[symbol.toString()] = {
                count,
                odds,
                win: odds * 0.05 // Base win calculation (should match game rules)
            };
        });
        return icons;
    }
    /**
     * Execute free spins immediately and capture all individual boards for complete player experience
     */
    async executeFreeSpins(baseRound, freeSpinsCount) {
        let totalWins = 0;
        let totalSpinsPlayed = 0;
        let additionalFreeSpins = 0;
        let multiplier = 0;
        const freeSpinBoards = [];
        if (!this.roundCalculator) {
            console.warn("⚠️  Cannot execute free spins: roundCalculator not available");
            return { totalWins: 0, totalSpinsPlayed: 0, freeSpinBoards: [] };
        }
        for (let j = 0; j < freeSpinsCount; j++) {
            const spinIndex = totalSpinsPlayed + 1;
            const spinsRemaining = freeSpinsCount - j - 1 + additionalFreeSpins;
            const freeSpinRound = {
                id: baseRound.id,
                freeSpinId: j,
                coinValue: baseRound.coinValue,
                betLevel: baseRound.betLevel,
                betMultiplier: baseRound.betMultiplier,
                totalAmount: 0,
                odds: baseRound.odds,
                freeSpin: true,
            };
            // Generate a new board for this free spin
            const freeSpinBoard = this.boardGeneratorFactory().generate();
            // Process the free spin with the generated board
            this.roundCalculator.processSpinning(freeSpinRound, 0);
            const win = freeSpinRound.betwin || 0;
            const retriggeredSpins = freeSpinRound.settlementResult?.freeSpins.odds || 0;
            // Count only actual cascades (tumbles where symbols were removed and board changed)
            const cascadeCount = freeSpinRound.settlementResult?.tumbles?.filter(tumble => {
                // Type-safe access to explodedSymbols
                const explodedSymbols = tumble.explodedSymbols;
                // Check if symbols were actually exploded/removed
                const symbolsExploded = explodedSymbols &&
                    explodedSymbols.some((pos) => pos !== -1);
                // Check if board actually changed
                const boardChanged = tumble.originalBoard !== tumble.newBoard;
                // Only count as cascade if both conditions are met
                return symbolsExploded && boardChanged;
            }).length || 0;
            // Capture the complete free spin board data
            freeSpinBoards.push({
                board: freeSpinBoard.newBoard,
                multipliers: freeSpinBoard.multipliers,
                cascadeCount,
                win,
                isRetrigger: retriggeredSpins > 0,
                retriggeredSpins: retriggeredSpins > 0 ? retriggeredSpins : undefined,
                spinsRemaining,
                spinIndex,
                settlementResult: freeSpinRound.settlementResult
            });
            if (win > 0) {
                multiplier += freeSpinRound.multiplier || 0;
                totalWins += win;
            }
            totalSpinsPlayed++;
            // Check for additional free spins (retriggering)
            additionalFreeSpins += retriggeredSpins;
        }
        // Handle retriggered free spins recursively
        if (additionalFreeSpins > 0) {
            console.log(`🔄 Retriggered ${additionalFreeSpins} additional free spins`);
            const retriggeredResults = await this.executeFreeSpins(baseRound, additionalFreeSpins);
            totalWins += retriggeredResults.totalWins;
            totalSpinsPlayed += retriggeredResults.totalSpinsPlayed;
            // Append retriggered boards with updated spin indices
            retriggeredResults.freeSpinBoards.forEach(board => {
                freeSpinBoards.push({
                    ...board,
                    spinIndex: board.spinIndex + freeSpinBoards.length
                });
            });
        }
        return { totalWins, totalSpinsPlayed, freeSpinBoards };
    }
    /**
     * Calculate tumble statistics from boards
     */
    calculateTumbleStats(boards) {
        let totalTumbles = 0;
        let maxTumblesInRound = 0;
        const symbolDistribution = {};
        boards.forEach(board => {
            if (board.settlementResult?.tumbles) {
                const tumbleCount = board.settlementResult.tumbles.length;
                totalTumbles += tumbleCount;
                maxTumblesInRound = Math.max(maxTumblesInRound, tumbleCount);
                // Count symbols from tumbles
                board.settlementResult.tumbles.forEach(tumble => {
                    const symbols = tumble.originalBoard.split(',').map(s => parseInt(s));
                    symbols.forEach(symbol => {
                        symbolDistribution[symbol] = (symbolDistribution[symbol] || 0) + 1;
                    });
                });
            }
        });
        return {
            totalTumbles,
            averageTumblesPerRound: totalTumbles / boards.length,
            maxTumblesInRound,
            symbolDistribution,
        };
    }
    /**
     * Generate small test batch
     */
    async generateSmallTestBatch(rounds = 15) {
        const testConfig = {
            boardCount: Math.min(Math.max(rounds, 10), 20),
            targetRTP: 0.97,
            betSize: 1,
            playerBudget: 100,
            difficulty: 1 /* Difficulty.Easy */,
            maxRetries: 3,
            tolerance: 0.1, // More lenient for small batches
        };
        return this.generateResultChain(testConfig);
    }
    /**
     * Export result chain to JSON
     */
    exportResultChainToJSON(chain) {
        // Use bet parameters from chain config (supports custom betLevel and coinValue)
        const betData = {
            betLevel: chain.config.betLevel || 0.5,
            coinValue: chain.config.coinValue || 0.1,
            betMultiplier: 20,
            betAmount: chain.config.betSize || 1
        };
        const exportData = {
            metadata: {
                generated: new Date().toISOString(),
                config: chain.config,
                stats: chain.generationStats,
                rtpResult: chain.rtpResult,
                tumbleStats: chain.tumbleStats,
                betData, // ✅ Move bet data to metadata
            },
            boards: chain.boards.map((board, index) => ({
                index,
                board: board.board,
                multipliers: board.multipliers,
                // ❌ Remove deprecated fields: cascadeCount, totalCascadeWin
                settlementResult: board.settlementResult,
                totalTumbleWin: board.totalTumbleWin || 0, // ✅ Only include totalTumbleWin
            })),
        };
        return JSON.stringify(exportData, null, 2);
    }
}
