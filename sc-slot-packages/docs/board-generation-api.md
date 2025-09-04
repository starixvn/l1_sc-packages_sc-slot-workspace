# 🎰 Board Generation API Guide

Technical documentation for the slot board generation system, RTP control, and settlement integration.

## 🏗️ Architecture Overview

### Component Structure
```
sc-slot-board-statistic/
├── result-chain-orchestrator.ts    # Main orchestration
├── rtp-controller.ts               # RTP management
├── board-generator-adapter.ts      # Board generation interface
└── External Dependencies:
    ├── sc-slot-board-generator     # Board creation
    └── sc-cascading-slot-base      # Settlement calculation
```

### Data Flow
```
1. Configuration → RTPController
2. Board Generation → BoardGeneratorAdapter → sc-slot-board-generator
3. Settlement Calculation → sc-cascading-slot-base RoundCalculator
4. RTP Validation → RTPController
5. Result Chain Assembly → ResultChainOrchestrator
```

## 🎯 Core Components

### ResultChainOrchestrator

Main orchestrator that manages the entire board generation pipeline.

```typescript
import { ResultChainOrchestrator } from "./cascading-slot/result-chain-orchestrator.js";
import { BoardGeneratorAdapter } from "./cascading-slot/board-generator-adapter.js";

// Initialize
const rtpConfig = {
    targetRTP: 0.85,
    tolerance: 0.05,
    boardCount: 50,
    betSize: 1.0,
    playerBudget: 100
};

const boardGeneratorFactory = () => new BoardGeneratorAdapter(
    {
        reels: 6,
        symbolsOnReel: 5,
        numberOfSymbols: 11,
        numberOfShuffles: 3
    },
    {
        min: 2,
        max: 21
    },
    Difficulty.Medium
);

const orchestrator = new ResultChainOrchestrator(boardGeneratorFactory, rtpConfig);

// Generate boards
const chainResult = await orchestrator.generateResultChain({
    boardCount: 50,
    targetRTP: 0.85,
    betSize: 1.0,
    playerBudget: 100,
    difficulty: Difficulty.Medium,
    maxRetries: 5,
    tolerance: 0.05
});
```

### Board Generator Adapter

Wraps `sc-slot-board-generator` for consistent interfacing.

```typescript
import { BoardGeneratorAdapter } from "./cascading-slot/board-generator-adapter.js";
import { Difficulty } from "sc-slot-board-generator";

const adapter = new BoardGeneratorAdapter(
    boardSettings,      // Board configuration
    multiplierConfig,   // Multiplier ranges
    difficulty          // Generation difficulty
);

// Generate single board
const board = adapter.generate();

// Explode and refill board
const result = adapter.explodeAndRefill(board, explodedPositions);

// Access underlying generator
const underlyingGenerator = adapter.getUnderlyingGenerator();
```

### RTP Controller

Manages RTP targeting and validation.

```typescript
import { RTPController } from "./cascading-slot/rtp-controller.js";

const rtpController = new RTPController({
    targetRTP: 0.85,
    tolerance: 0.05,
    boardCount: 100,
    betSize: 1.0,
    playerBudget: 100
});

// Check if next board should win
const shouldWin = rtpController.shouldNextBoardWin(currentResults);

// Validate RTP target achievement
const rtpResult = rtpController.validateRTPTarget(finalResults);
```

## 🎲 Board Generation Process

### Step 1: Configuration
```typescript
interface BoardSettings {
    reels: number;              // Number of reels (columns)
    symbolsOnReel: number;      // Symbols per reel (rows)
    numberOfSymbols: number;    // Total symbol types
    numberOfShuffles: number;   // Randomization passes
}

interface MultiplierConfig {
    min: number;                // Minimum multiplier value
    max: number;                // Maximum multiplier value
}
```

### Step 2: Generation
```typescript
interface BoardResult {
    board: number[];            // Generated board (symbol IDs)
    multipliers: number[];      // Associated multipliers
    payoutResult?: PayoutResult; // Basic payout calculation
    settlementResult: {         // Real settlement from external calculator
        tumbles: [{
            originalBoard: string;
            newBoard: string;
            multipliers: number[];
            icons: object;
            win: number;
        }];
        freeSpins: {
            count: number;
            odds: number;
        };
    };
    totalWin: number;           // Sum of all wins (tumbles + features)
    cascadeCount: number;       // Number of cascades
    isFreeSpin: boolean;        // Is this a free spin round
    accumulatedMultiplier: number; // Current multiplier
    remainingFreeSpins: number; // Free spins left
}
```

### Step 3: Settlement Integration
```typescript
// External settlement calculation
import RoundCalculator from "sc-cascading-slot-base/src/board/round-calculator";
import TumbleCalculator from "sc-cascading-slot-base/src/board/tumble-calculator";

const calculator = new RoundCalculator({
    boardGenerator: adapter.getUnderlyingGenerator(),
    tumbleCalculator: new TumbleCalculator()
});

// Process real settlement
calculator.processSpinning(round, totalMultiplier);
// Result populated in round.settlementResult
```

## 📊 Data Structures

### ResultChain
```typescript
interface ResultChain {
    boards: BoardResult[];      // Array of generated boards
    rtpResult: RTPResult;       // RTP validation results
    generationStats: {          // Generation metadata
        attempts: number;
        duration: number;
        targetMet: boolean;
    };
}
```

### RTPResult
```typescript
interface RTPResult {
    targetMet: boolean;         // Was target RTP achieved
    actualRTP: number;          // Calculated RTP
    variance: number;           // Difference from target
    totalWagered: number;       // Total amount wagered
    totalWon: number;           // Total amount won
    attempts: number;           // Generation attempts needed
}
```

### Win Distribution
```typescript
interface WinDistribution {
    losses: number;             // Rounds with no win
    smallWins: number;          // Wins < 1x bet
    mediumWins: number;         // Wins 1x-5x bet
    bigWins: number;            // Wins > 5x bet
}
```

## 🔧 Configuration Options

### RTP Configuration
```typescript
interface RTPConfiguration {
    targetRTP: number;          // Target return percentage (0-1)
    tolerance: number;          // Acceptable variance (0-1)
    boardCount: number;         // Boards to generate
    betSize: number;            // Bet per round
    playerBudget: number;       // Total player budget
}
```

### Result Chain Configuration
```typescript
interface ResultChainConfig {
    boardCount: number;         // Number of boards
    targetRTP: number;          // RTP target
    betSize: number;            // Bet size
    playerBudget: number;       // Budget
    difficulty: Difficulty;     // Generation difficulty
    maxRetries: number;         // Max generation attempts
    tolerance: number;          // RTP tolerance
}
```

## 🎯 Feature Integration

### Tumble/Cascade System
```typescript
// Tumbles are handled by external settlement
const tumbleWins = board.settlementResult.tumbles.map(t => t.win);
const totalTumbleWin = tumbleWins.reduce((sum, win) => sum + win, 0);
```

### Free Spin System
```typescript
// Free spins triggered by settlement
const freeSpinCount = board.settlementResult.freeSpins.count;
const freeSpinOdds = board.settlementResult.freeSpins.odds;
```

### Multiplier System
```typescript
// Multipliers on each tumble
board.settlementResult.tumbles.forEach(tumble => {
    const multipliers = tumble.multipliers; // Array of multipliers
    // Applied during settlement calculation
});
```

## 🧪 Testing Integration

### Unit Testing Board Generation
```typescript
describe('Board Generation', () => {
    it('should generate valid boards', async () => {
        const adapter = new BoardGeneratorAdapter(boardSettings, multiplierConfig);
        const board = adapter.generate();
        
        expect(board.newBoard).toHaveLength(30); // 6x5 board
        expect(board.multipliers).toHaveLength(30);
    });
});
```

### Integration Testing with Settlement
```typescript
describe('Settlement Integration', () => {
    it('should calculate real wins', async () => {
        const orchestrator = new ResultChainOrchestrator(factory, rtpConfig);
        const chain = await orchestrator.generateResultChain(config);
        
        // Verify settlement results exist
        chain.boards.forEach(board => {
            expect(board.settlementResult).toBeDefined();
            expect(board.settlementResult.tumbles).toBeInstanceOf(Array);
        });
    });
});
```

### RTP Validation Testing
```typescript
describe('RTP Validation', () => {
    it('should meet RTP targets', async () => {
        const config = { targetRTP: 0.85, tolerance: 0.05, boardCount: 100 };
        const chain = await orchestrator.generateResultChain(config);
        
        expect(chain.rtpResult.targetMet).toBe(true);
        expect(Math.abs(chain.rtpResult.variance)).toBeLessThan(0.05);
    });
});
```

## 📋 Error Handling

### Common Errors
```typescript
// External calculator not available
catch (error) {
    if (error.message.includes('sc-cascading-slot-base')) {
        console.warn('External calculator unavailable, using fallback');
        // Implement fallback logic
    }
}

// RTP target not achievable
if (!rtpResult.targetMet && attempts >= maxRetries) {
    throw new Error(`RTP target ${targetRTP} not achievable after ${attempts} attempts`);
}

// Invalid configuration
if (boardCount < 1) {
    throw new Error('Board count must be positive');
}
```

### Graceful Degradation
```typescript
// Fallback when external settlement unavailable
private getBasicWin(board: any): number {
    return board.payoutResult?.totalWin || 0;
}

// Fallback feature detection
private hasBasicFeatures(board: any): boolean {
    return (board.multipliers && board.multipliers.some(m => m > 1)) ||
           (board.newBoard && this.detectScatters(board.newBoard));
}
```

## 🔗 External Dependencies

### sc-slot-board-generator
```typescript
import { BoardGenerator, Difficulty } from "sc-slot-board-generator";
// Used for: Basic board generation, symbol placement
```

### sc-cascading-slot-base  
```typescript
import RoundCalculator from "sc-cascading-slot-base/src/board/round-calculator";
import TumbleCalculator from "sc-cascading-slot-base/src/board/tumble-calculator";
// Used for: Real settlement calculation, tumble processing
```

## 🚀 Performance Considerations

### Memory Management
- Board results are processed in batches
- Large result chains (>1000 boards) should be streamed
- Cleanup intermediate objects during generation

### Generation Speed
- Average: 30-50ms per board (with settlement)
- Batch size: 20 boards for optimal memory usage
- RTP targeting: 1-5 attempts typical for 85% RTP

### Settlement Calculator Performance
- External calculator adds ~15-25ms per board
- Caching can reduce repeated calculations
- Consider fallback for high-volume scenarios

---

**Last Updated**: December 2024  
**API Version**: v1.2  
**Status**: ✅ Production Ready
