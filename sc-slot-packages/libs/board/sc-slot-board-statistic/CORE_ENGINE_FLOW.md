# Core Engine Flow - Board Generation & Cascading Loop

## 🎯 **Core Engine Focus: The Two Critical Processes**

### **1. Board Generation → Initial board + multipliers**

```typescript
// BoardGenerator.generate()
generate(): IBoard {
    const generator = this.getSymbolGenerator();
    const board = generator.randomSymbols(this.settings.reels * this.settings.symbolsOnReel);

    return {
        newBoard: board,                                    // ← Generated board (30 symbols)
        multipliers: this.multiplierGenerator.generate(board), // ← Multipliers for symbol 10s
    };
}
```

#### **Board Generation Process:**
```
1. SymbolsGenerator.randomSymbols(30) → Generate 30 random symbols (0-10)
2. MultiplierGenerator.generate(board) → Find symbol 10s + create multiplier values
3. Return { newBoard, multipliers }
```

#### **Multiplier Generation Detail:**
```typescript
// MultiplierGenerator.generate()
generate(board: number[]): number[] {
    const getMultiplierSymbols = filter<number>(isMultiplierSymbol); // Find symbol 10s
    const getRandomValue = () => this.randomValue();

    return pipe(getMultiplierSymbols, map(getRandomValue))(board);
}
```

**Flow:**
```
Board [4,3,1,2,2,5,6,4,3,1,9,9,10,2,1,3,9,9,5,6,1,5,5,7,3,2,3,9,9,7]
         ↓
filter(isMultiplierSymbol) → Find symbol 10 at position 12
         ↓
map(getRandomValue) → Generate random multiplier (e.g., 5)
         ↓
Result: multipliers = [5]
```

### **2. Cascading Loop → Win detection → Payout calculation → Board cascade → Repeat**

```typescript
// RoundCalculator.processSpinning() - Conceptual Flow
let currentBoard = initialBoard.newBoard;
let currentMultipliers = initialBoard.multipliers;
const tumbles = [];

do {
    // A. WIN DETECTION
    const winningSymbols = this.detectWins(currentBoard);
    
    if (winningSymbols.length > 0) {
        // B. PAYOUT CALCULATION
        const winAmount = this.calculateWinAmount(winningSymbols, round.odds);
        
        // C. CREATE TUMBLE RECORD
        const tumble = {
            originalBoard: currentBoard.join(','),
            newBoard: '',  // Will be filled after cascade
            icons: winningSymbols,
            win: winAmount,
            multipliers: currentMultipliers,
        };
        
        // D. BOARD CASCADE
        const cascadeResult = this.boardGenerator.explodeAndRefill(
            currentBoard, 
            winningSymbols, 
            currentMultipliers
        );
        
        // E. UPDATE STATE
        currentBoard = cascadeResult.newBoard;
        currentMultipliers = cascadeResult.multipliers;
        tumble.newBoard = currentBoard.join(',');
        
        tumbles.push(tumble);
    }
} while (winningSymbols.length > 0);
```

## 🔄 **Detailed Cascading Process** (`explodeAndRefill()`)

```typescript
explodeAndRefill(board: number[], winSymbols: number[], oldMultipliers: number[]): IBoard {
    // Step 1: EXPLOSION - Mark winning symbols for removal
    const exploded = replace(complement(isWinningSymbol), NO_SYMBOL, board);
    const remained = replace(isWinningSymbol, NO_SYMBOL, board);
    
    // Step 2: COLLAPSE - Apply gravity (symbols fall down)
    const collapsed = this.collapse(remained);
    
    // Step 3: REFILL - Generate new symbols
    const numberOfNewSymbols = count(isWinningSymbol, board);
    const newSymbols = this.getRefillSymbols(numberOfNewSymbols);
    
    // Step 4: ARRANGE NEW BOARD
    const newBoard = replaceEach(isNoSymbol, newSymbols, collapsed);
    
    // Step 5: ARRANGE MULTIPLIERS (Key Process!)
    const multipliers = this.arrangeMultiplierSymbols(collapsed, newSymbols, oldMultipliers);

    return {
        newBoard: newBoard,
        explodedSymbols: exploded,
        newSymbols: filled,
        multipliers: multipliers,  // ← Final multipliers array
    };
}
```

### **Critical Multiplier Arrangement:**
```typescript
arrangeMultiplierSymbols(collapsed: number[], newSymbols: number[], oldMultiplierValues: number[]) {
    // Step 1: Generate NEW multiplier values for newly added symbol 10s
    const newMultiplierValues = this.getMultiplierValues(newSymbols, oldMultiplierValues);

    // Step 2: Map OLD multiplier values to cascaded positions
    const oldMultiplierValueBoard = this.arrangeMultiplierValueToBoard(collapsed, oldMultiplierValues);
    
    // Step 3: Map NEW multiplier values to new symbol positions
    const newMultiplierValueBoard = this.arrangeMultiplierValueToBoard(newSymbols, newMultiplierValues);

    // Step 4: MERGE old and new multiplier boards
    const mergedMultiplierValueBoard = replaceEach(isNoSymbol, newMultiplierValueBoard, oldMultiplierValueBoard);

    // Step 5: Extract final multipliers array (position-based order)
    return reject(isSpecialSymbol, mergedMultiplierValueBoard);
}
```

## 🎯 **Core Engine Visual Flow**

```
┌─────────────────┐
│ INITIAL BOARD   │
│ GENERATION      │
└─────┬───────────┘
      │ generate()
      ▼
┌─────────────────┐    ┌─────────────────┐
│ Random Symbols  │───▶│ Multiplier Gen  │
│ (0-10, 30 pos)  │    │ (find symbol 10s│
└─────────────────┘    │ + create values)│
                       └─────┬───────────┘
                             │
                             ▼
                   ┌─────────────────┐
                   │ Initial Result  │
                   │ board + mults   │
                   └─────┬───────────┘
                         │
                         ▼
              ┌─────────────────┐
              │ CASCADING LOOP  │
              │ (while wins)    │
              └─────┬───────────┘
                    │
                    ▼
        ┌─────────────────┐
        │ 1. WIN DETECTION│ → Scan board for winning combinations
        └─────┬───────────┘
              │
              ▼
        ┌─────────────────┐
        │ 2. PAYOUT CALC  │ → Apply odds tables, calculate amounts
        └─────┬───────────┘
              │
              ▼
        ┌─────────────────┐
        │ 3. TUMBLE CREATE│ → Record: originalBoard, icons, win, multipliers
        └─────┬───────────┘
              │
              ▼
        ┌─────────────────┐
        │ 4. BOARD CASCADE│ → explodeAndRefill()
        └─────┬───────────┘
              │
              ▼
     ┌─────────────────┐
     │ 4a. EXPLODE     │ → Mark winning symbols as NO_SYMBOL
     └─────┬───────────┘
           │
           ▼
     ┌─────────────────┐
     │ 4b. COLLAPSE    │ → Gravity: symbols fall down within reels
     └─────┬───────────┘
           │
           ▼
     ┌─────────────────┐
     │ 4c. REFILL      │ → Generate new symbols for empty spaces
     └─────┬───────────┘
           │
           ▼
     ┌─────────────────┐
     │ 4d. MULTIPLIERS │ → arrangeMultiplierSymbols()
     └─────┬───────────┘   • Map old values to cascaded positions
           │               • Generate new values for new symbol 10s
           │               • Merge and extract position-based array
           ▼
     ┌─────────────────┐
     │ 5. UPDATE STATE │ → currentBoard, currentMultipliers
     └─────┬───────────┘
           │
           ▼
     ┌─────────────────┐
     │ 6. CHECK WINS   │ → More winning combinations?
     └─────┬───────────┘
           │ YES: Continue Loop
           │ NO: End
           ▼
     ┌─────────────────┐
     │ FINAL RESULT    │ → All tumbles + final board state
     └─────────────────┘
```

## 🔧 **Key Engine Components:**

### **1. SymbolsGenerator**
- Generates random symbols 0-10 based on difficulty weights
- Creates the initial 30-symbol board (6 reels × 5 symbols)

### **2. MultiplierGenerator** 
- Scans board for symbol 10s using `filter(isMultiplierSymbol)`
- Generates random multiplier values (min-max range)
- Returns array in position-discovery order

### **3. Win Detection Engine**
- Scans for adjacent matching symbols (clusters)
- Applies minimum cluster size rules
- Returns winning symbol positions + counts

### **4. Cascade Engine** (`explodeAndRefill`)
- **Explode**: Mark winners as NO_SYMBOL (-1)
- **Collapse**: Apply gravity within each reel
- **Refill**: Add new symbols from top
- **Multiplier Management**: Preserve + generate new values

### **5. Multiplier Arrangement**
- Maps old multipliers to new cascaded positions
- Generates new multipliers for newly added symbol 10s  
- Maintains position-based array ordering

## 🎯 **Core Insight:**

The engine's **cascading loop** is what creates the complex multiplier scenarios we analyzed. Each cascade can:
- Move existing symbol 10s to new positions (preserve values)
- Add new symbol 10s from refill (generate new values)
- Create the position-based multipliers array we observed

This explains why the multiplier relationship is **always position-based** - it's built into the core `arrangeMultiplierSymbols()` logic that runs on every cascade!

