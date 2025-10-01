# Spin Generation Flow

## 🎰 Complete Flow of Generating a Spin

Based on the analysis of `statistic-runner.ts`, `BoardGenerator`, and `RoundCalculator`, here's the comprehensive flow of how a spin is generated:

## 📋 **1. Batch Initialization** (`spinABatch()`)

```typescript
export function spinABatch(options: BatchOptions) {
    // Step 1: Initialize components
    const generator = new BoardGenerator(commonDefinition.boardSettings, options.multiplierSettings, options.modeSettings, options.difficulty);
    const calculator = new RoundCalculator({
        boardGenerator: generator,
        tumbleCalculator: new TumbleCalculator(),
    });
    
    // Step 2: Setup game configuration
    const odds = {
        oddsByCounts: Object.assign({}, defaultOdds.normalSymbols.map(prop("payout"))),
        freeSpins: defaultOdds.freeSpins,
    };
    
    // Step 3: Initialize statistics tracking
    const statistic: Statistic = { /* ... */ };
    const betMultiplier = 20;
    
    // Step 4: Process each round
    for (let i = 0; i < options.numberOfRounds; i++) {
        // ... individual spin processing
    }
}
```

## 🎯 **2. Individual Spin Processing**

### **Step 2.1: Round Setup**
```typescript
const round: Round = {
    id: i,                                                    // Round identifier
    coinValue: options.coinValue,                            // e.g., 0.1
    betLevel: options.betLevel,                              // e.g., 1.0
    betMultiplier: 20,                                       // Fixed multiplier
    totalAmount: options.coinValue * options.betLevel * 20, // Total bet amount
    odds,                                                    // Payout tables
};
```

### **Step 2.2: Spin Execution**
```typescript
spin(calculator, statistic, round, 0);
```

## 🔧 **3. Core Spin Function** (`spin()`)

```typescript
function spin(calculator: RoundCalculator, statistic: Statistic, round: Round, totalMultiplier = 0) {
    // Step 1: Process the spin (this is where the magic happens)
    calculator.processSpinning(round, totalMultiplier);
    
    // Step 2: Calculate statistics from the results
    calculateStatistic(round)(statistic);
    
    return round;
}
```

## 🎲 **4. RoundCalculator.processSpinning() - The Core Engine**

This is the **main processing engine** (from external `sc-cascading-slot-base` package):

```typescript
// External package: sc-cascading-slot-base/src/board/round-calculator
calculator.processSpinning(round, totalMultiplier);
```

**What `processSpinning()` does:**

### **4.1: Initial Board Generation**
```typescript
// Inside RoundCalculator (conceptual flow):
const initialBoard = this.boardGenerator.generate();
// Returns: { newBoard: number[], multipliers: number[] }
```

### **4.2: Win Detection & Cascading Loop**
```typescript
let currentBoard = initialBoard.newBoard;
let currentMultipliers = initialBoard.multipliers;
const tumbles = [];

do {
    // A. Detect winning combinations
    const winningSymbols = this.detectWins(currentBoard);
    
    if (winningSymbols.length > 0) {
        // B. Calculate win amounts
        const winAmount = this.calculateWinAmount(winningSymbols, round.odds);
        
        // C. Create tumble record
        const tumble = {
            originalBoard: currentBoard.join(','),
            icons: winningSymbols,
            win: winAmount,
            multipliers: currentMultipliers,
            // ... other tumble data
        };
        
        // D. Process cascading
        const cascadeResult = this.boardGenerator.explodeAndRefill(
            currentBoard, 
            winningSymbols, 
            currentMultipliers
        );
        
        // E. Update for next iteration
        currentBoard = cascadeResult.newBoard;
        currentMultipliers = cascadeResult.multipliers;
        
        tumble.newBoard = currentBoard.join(',');
        tumbles.push(tumble);
    }
} while (winningSymbols.length > 0);
```

### **4.3: Final Settlement Result**
```typescript
// Populate the round object with results
round.settlementResult = {
    tumbles: tumbles,
    freeSpins: { count: scatterCount, odds: freeSpinAward },
    additionalFreeSpins: { count: 0, odds: 0 }
};

round.betwin = totalWinAmount;
round.multiplier = finalMultiplier;
round.totalTumbleWin = totalTumbleWin;
```

## 🔄 **5. Detailed Cascading Process**

### **5.1: Win Detection**
```
Current Board → Scan for winning combinations → Identify winning symbols
```

### **5.2: Tumble Creation**
```
Winning Symbols → Calculate payouts → Create tumble record with:
- originalBoard (before cascade)
- icons (winning symbols + payouts)  
- win (tumble win amount)
- multipliers (current multiplier values)
```

### **5.3: Board Cascading** (`explodeAndRefill()`)
```
1. Mark winning symbols for removal
2. Collapse remaining symbols (gravity effect)
3. Generate new symbols to fill empty spaces
4. Handle multiplier symbols:
   - Preserve existing multiplier values for cascaded symbol 10s
   - Generate new multiplier values for newly added symbol 10s
5. Return new board state
```

### **5.4: Iteration**
```
New Board → Check for new wins → Repeat until no more wins
```

## 🎯 **6. Free Spins Processing** (if triggered)

```typescript
let freeSpins = round.settlementResult.freeSpins.odds;

if (freeSpins) {
    executeFreeSpins(calculator, statistic, round, 0, freeSpins, options.debug);
}
```

### **Free Spin Flow:**
```typescript
function executeFreeSpins(calculator, statistic, round, totalMultiplier, spins, debug) {
    for (let j = 0; j < spins; j++) {
        // Create free spin round
        const freeSpinRound: Round = {
            id: round.id,
            freeSpinId: j,
            // ... copy base round data
            freeSpin: true,
        };
        
        // Process free spin (same as regular spin)
        spin(calculator, statistic, freeSpinRound, multiplier);
        
        // Accumulate multipliers for next free spin
        if (freeSpinRound.betwin) {
            multiplier += freeSpinRound.multiplier;
        }
    }
}
```

## 📊 **7. Statistics Calculation**

After each spin (regular or free):
```typescript
calculateStatistic(round)(statistic);
```

**Updates:**
- Total rounds, winning rounds
- Total bet amount, total payout
- RTP calculation
- Multiplier statistics
- Symbol counts
- Maximum values tracking

## 🎰 **8. Complete Spin Flow Diagram**

```
┌─────────────────┐
│  spinABatch()   │ → Initialize components & configuration
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│   Round Setup   │ → Create Round object with bet details
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│    spin()       │ → Main spin orchestrator
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ processSpinning │ → External RoundCalculator engine
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Generate Board  │ → BoardGenerator.generate()
└─────────┬───────┘   • Create initial board
          │           • Generate multipliers for symbol 10s
          ▼
┌─────────────────┐
│ Detect Wins     │ → Scan board for winning combinations
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Calculate Wins  │ → Apply payout tables, calculate amounts
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Create Tumble   │ → Record tumble data (board, wins, multipliers)
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Cascade Board   │ → explodeAndRefill()
└─────────┬───────┘   • Remove winning symbols
          │           • Collapse remaining symbols
          ▼           • Add new symbols from top
┌─────────────────┐   • Handle multiplier preservation/generation
│ More Wins?      │ 
└─────┬───────────┘
      │ Yes
      └─────────────┐
                    │ No
                    ▼
          ┌─────────────────┐
          │ Free Spins?     │
          └─────┬───────────┘
                │ Yes
                ▼
      ┌─────────────────┐
      │ executeFreeSpins│ → Process each free spin
      └─────┬───────────┘   (same flow as regular spin)
            │ No
            ▼
  ┌─────────────────┐
  │ Update Stats    │ → calculateStatistic()
  └─────────────────┘
```

## 🎯 **Key Insights:**

1. **External Processing**: The core logic is in `sc-cascading-slot-base` RoundCalculator
2. **Cascading Loop**: Continues until no more winning combinations
3. **Multiplier Handling**: Preserved during cascades, new values for new symbol 10s
4. **Free Spins**: Processed as separate spins with multiplier accumulation
5. **Statistics**: Updated after each spin for comprehensive tracking
6. **Board Generation**: Uses BoardGenerator for initial and refill symbols

This flow ensures realistic cascading slot behavior with proper multiplier management and comprehensive result tracking!

