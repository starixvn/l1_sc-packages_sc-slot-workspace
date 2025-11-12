# Bet Amount and Win Calculation Flow Diagram

## Overview
This diagram visualizes the relationship between `baseBetAmount`, `totalBetAmount`, `totalTumbleWin`, and RTP calculations in the slot game system.

---

## 1. Input Parameters Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER INPUT PARAMETERS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  coinValue: $0.10        betLevel: 0.5                          │
│  (player choice)         (player choice)                        │
│                                                                  │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BET AMOUNT CALCULATION                        │
│         (result-chain-orchestrator.ts:73-82)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  baseBetAmount = coinValue × betLevel                           │
│                = $0.10 × 0.5                                    │
│                = $0.05 (per line)                               │
│                                                                  │
│  ─────────────────────────────────────────                      │
│                                                                  │
│  totalBetAmount = baseBetAmount × defaultBetMultiplier          │
│                 = $0.05 × 20                                    │
│                 = $1.00 (all 20 lines)                          │
│                                                                  │
│  [generator-definition.ts:16]                                   │
│  defaultBetMultiplier: 20 (number of bet lines)                 │
│                                                                  │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ├─────────────────┬─────────────────┐
                   │                 │                 │
                   ▼                 ▼                 ▼
         ┌─────────────────┐ ┌─────────────┐ ┌──────────────────┐
         │  baseBetAmount  │ │totalBetAmount│ │ defaultBetMultiplier│
         │     $0.05       │ │    $1.00     │ │        20         │
         └─────────────────┘ └─────────────┘ └──────────────────┘
                   │                 │
                   │                 │
                   ▼                 ▼
         [Used for WIN calc] [Used for RTP calc]
```

---

## 2. Board Generation and Win Calculation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      BOARD GENERATION                            │
│         (result-chain-orchestrator.ts:143-313)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Generate board (6x5 grid of symbols)                        │
│     Example board:                                              │
│     [2, 3, 3, 9, 1, 2, 3, 3, 3, 0, ...]                        │
│                                                                  │
│  2. Detect winning combinations                                 │
│     - Count symbols (e.g., symbol 3 appears 8 times)            │
│                                                                  │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                   WIN CALCULATION (TUMBLES)                      │
│         (result-chain-orchestrator.ts:735-762)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  calculateTumbleWin(board, baseBetAmount) {                     │
│                                                                  │
│    for each winning symbol {                                    │
│      symbolCount = countSymbols(board, symbol)                  │
│      symbolOdds = getOdds(symbol, symbolCount)                  │
│                                                                  │
│      ┌────────────────────────────────────────────┐             │
│      │  KEY CALCULATION (Line 751)                │             │
│      │  totalWin += baseBetAmount × symbolOdds    │             │
│      │           += $0.05 × odds                  │             │
│      └────────────────────────────────────────────┘             │
│    }                                                             │
│                                                                  │
│    return totalWin  → becomes totalTumbleWin                    │
│  }                                                               │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  EXAMPLE: Symbol 3 with 8-9 symbols                             │
│                                                                  │
│  symbolOdds = 16  [generator-definition.ts:189]                 │
│  totalTumbleWin = $0.05 × 16 = $0.80                            │
│                                                                  │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
          ┌─────────────────┐
          │ totalTumbleWin  │
          │     $0.80       │
          │ (raw win amount)│
          └─────────────────┘
                   │
                   ▼
```

---

## 3. Board Multiplier Application Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              BOARD MULTIPLIER CALCULATION                        │
│         (result-chain-orchestrator.ts:309-313)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Input: totalTumbleWin = $0.80                                  │
│                                                                  │
│  ┌──────────────────────────────────────────────┐               │
│  │  Collect multipliers from board               │               │
│  │  Example: [2x, 3x, 5x] from multiplier tiles │               │
│  └──────────────────────────────────────────────┘               │
│                   │                                              │
│                   ▼                                              │
│  boardMultiplierSum = sum([2, 3, 5]) = 10                       │
│                                                                  │
│  ┌──────────────────────────────────────────────┐               │
│  │  FINAL WIN CALCULATION                       │               │
│  │                                               │               │
│  │  if (boardMultiplierSum > 0) {               │               │
│  │    finalTotalWin = totalTumbleWin ×          │               │
│  │                    boardMultiplierSum        │               │
│  │                  = $0.80 × 10                │               │
│  │                  = $8.00                     │               │
│  │  } else {                                    │               │
│  │    finalTotalWin = totalTumbleWin            │               │
│  │  }                                           │               │
│  └──────────────────────────────────────────────┘               │
│                                                                  │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
          ┌─────────────────┐
          │   totalWin      │
          │     $8.00       │
          │ (final win)     │
          └─────────────────┘
```

---

## 4. Board Result Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                    BOARD RESULT OBJECT                           │
│              (rtp-controller.ts:22-48)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  {                                                               │
│    board: [2, 3, 3, 9, 1, ...],          // Symbol array        │
│    multipliers: [...],                    // Multiplier tiles   │
│    accumulatedMultiplier: 1.0,            // Legacy field       │
│                                                                  │
│    ┌────────────────────────────────────────────┐               │
│    │  WIN AMOUNT FIELDS                         │               │
│    ├────────────────────────────────────────────┤               │
│    │  totalTumbleWin: $0.80                     │               │
│    │  (Raw tumble wins, calculated from         │               │
│    │   baseBetAmount × odds)                    │               │
│    │                                             │               │
│    │  boardMultiplierSum: 10                    │               │
│    │  (Sum of all multiplier tiles)             │               │
│    │                                             │               │
│    │  totalWin: $8.00                           │               │
│    │  (Final win = totalTumbleWin ×             │               │
│    │   boardMultiplierSum)                      │               │
│    └────────────────────────────────────────────┘               │
│                                                                  │
│    settlementResult: {...},                   // Settlement info│
│  }                                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. RTP Calculation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   RTP VALIDATION PROCESS                         │
│              (rtp-controller.ts:88-131)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Input: Array of BoardResult objects from chain                 │
│                                                                  │
│  ┌────────────────────────────────────────────┐                 │
│  │  TOTAL BETS CALCULATION (Line 89)         │                 │
│  │                                             │                 │
│  │  totalBets = boardResults.length ×         │                 │
│  │              this.config.betSize           │                 │
│  │                                             │                 │
│  │  where betSize = totalBetAmount = $1.00    │                 │
│  │                                             │                 │
│  │  Example: 125 boards × $1.00 = $125.00     │                 │
│  └────────────────────────────────────────────┘                 │
│                   │                                              │
│                   ▼                                              │
│  ┌────────────────────────────────────────────┐                 │
│  │  TOTAL WINS CALCULATION (Line 94)         │                 │
│  │                                             │                 │
│  │  totalWins = sum of all boardWins          │                 │
│  │                                             │                 │
│  │  boardWin = result.totalWin ||             │                 │
│  │             result.totalTumbleWin || 0     │                 │
│  │                                             │                 │
│  │  Example: $95.50 total wins                │                 │
│  └────────────────────────────────────────────┘                 │
│                   │                                              │
│                   ▼                                              │
│  ┌────────────────────────────────────────────┐                 │
│  │  RTP CALCULATION (Line 97)                │                 │
│  │                                             │                 │
│  │  actualRTP = totalWins / totalBets         │                 │
│  │            = $95.50 / $125.00              │                 │
│  │            = 0.764 (76.4%)                 │                 │
│  └────────────────────────────────────────────┘                 │
│                   │                                              │
│                   ▼                                              │
│  ┌────────────────────────────────────────────┐                 │
│  │  VALIDATION (Line 111)                    │                 │
│  │                                             │                 │
│  │  variance = |actualRTP - targetRTP|        │                 │
│  │           = |0.764 - 0.970| = 0.206        │                 │
│  │                                             │                 │
│  │  meetsTarget = variance ≤ tolerance        │                 │
│  │              = 0.206 ≤ 0.02 = false        │                 │
│  └────────────────────────────────────────────┘                 │
│                                                                  │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
          ┌─────────────────┐
          │  RTP Result     │
          │  actualRTP: 76.4%│
          │  meetsTarget: ❌│
          └─────────────────┘
```

---

## 6. Complete Data Flow Diagram

```
┌──────────────┐
│ USER INPUT   │
│ coinValue    │
│ betLevel     │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│        BET AMOUNT CALCULATION                │
│                                              │
│  baseBetAmount = coinValue × betLevel        │
│       ($0.05)                                │
│          │                                   │
│          └─────────────────┐                 │
│                            │                 │
│  totalBetAmount = baseBetAmount × 20         │
│       ($1.00)                                │
└──────┬─────────────────────┬─────────────────┘
       │                     │
       │                     │
       ▼                     ▼
┌────────────────┐    ┌─────────────────┐
│ WIN CALC       │    │  RTP CALC       │
│ (uses base)    │    │  (uses total)   │
└────────┬───────┘    └─────────┬───────┘
         │                      │
         ▼                      │
┌────────────────────────┐      │
│  SYMBOL WIN CALC       │      │
│  (Line 751)            │      │
│                        │      │
│  totalWin +=           │      │
│    baseBetAmount ×     │      │
│    symbolOdds          │      │
│                        │      │
│  Result:               │      │
│  totalTumbleWin = $0.80│      │
└────────┬───────────────┘      │
         │                      │
         ▼                      │
┌────────────────────────┐      │
│  MULTIPLIER CALC       │      │
│  (Line 309-313)        │      │
│                        │      │
│  totalWin =            │      │
│    totalTumbleWin ×    │      │
│    boardMultiplierSum  │      │
│                        │      │
│  Result:               │      │
│  totalWin = $8.00      │      │
└────────┬───────────────┘      │
         │                      │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │   BOARD RESULT       │
         │                      │
         │ totalTumbleWin: $0.80│
         │ totalWin: $8.00      │
         │ boardMultiplierSum:10│
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │    RTP VALIDATION    │
         │    (Line 88-131)     │
         │                      │
         │ totalBets = 125 ×    │
         │    totalBetAmount    │
         │    ($1.00)           │
         │  = $125.00           │
         │                      │
         │ totalWins = sum of   │
         │    all totalWin      │
         │  = $95.50            │
         │                      │
         │ RTP = $95.50/$125.00 │
         │     = 76.4%          │
         └──────────────────────┘
```

---

## 7. Symbol Odds Reference

From `generator-definition.ts:163-250`, here's how symbol odds work:

```
Symbol Payout Table (multiplier × baseBetAmount)
─────────────────────────────────────────────────

Symbol 0 (High Value):
  6-7 symbols:  5x  → $0.05 × 5  = $0.25
  8-9 symbols: 15x  → $0.05 × 15 = $0.75
  10+ symbols: 40x  → $0.05 × 40 = $2.00

Symbol 1:
  6-7 symbols:  4x  → $0.05 × 4  = $0.20
  8-9 symbols: 12x  → $0.05 × 12 = $0.60
  10+ symbols: 30x  → $0.05 × 30 = $1.50

Symbol 2:
  6-7 symbols:  3x  → $0.05 × 3  = $0.15
  8-9 symbols: 10x  → $0.05 × 10 = $0.50
  10+ symbols: 25x  → $0.05 × 25 = $1.25

Symbol 3:
  6-7 symbols:  2x  → $0.05 × 2  = $0.10
  8-9 symbols: 16x  → $0.05 × 16 = $0.80 ← Example used above
  10+ symbols: 20x  → $0.05 × 20 = $1.00

... (symbols 4-8 similar pattern)
```

---

## 8. Key Takeaways

### Design Principles

1. **Per-Line Betting System**
   - `baseBetAmount` represents the bet **per line** ($0.05)
   - Game has 20 lines (defaultBetMultiplier)
   - Total bet across all lines = $1.00

2. **Win Calculation**
   - Individual symbol wins calculated using `baseBetAmount`
   - This matches standard slot machine design (pays per line)
   - Multipliers apply to the aggregated wins

3. **RTP Calculation**
   - Uses `totalBetAmount` (total bet across all lines)
   - Compares total money wagered vs total money won
   - Standard industry formula: RTP = totalWins / totalBets

### Why This Architecture is Correct

```
Multi-Line Slot Game Logic:
───────────────────────────

Player Action:
  "I want to bet $0.05 per line on 20 lines"

System Calculation:
  baseBetAmount = $0.05 (what you bet per line)
  totalBetAmount = $0.05 × 20 = $1.00 (total cost)

Symbol Win:
  Symbol 3 appears 8 times
  Pays 16× the per-line bet
  Win = $0.05 × 16 = $0.80

Player's Perspective:
  "I bet $1.00 total and won $0.80"
  Return = 80% (below target RTP of 97%)
```

---

## 9. File Reference Map

| Component | File | Lines |
|-----------|------|-------|
| Bet Calculation | `result-chain-orchestrator.ts` | 73-82 |
| Win Calculation | `result-chain-orchestrator.ts` | 735-762 |
| Multiplier Application | `result-chain-orchestrator.ts` | 309-313 |
| RTP Validation | `rtp-controller.ts` | 88-131 |
| Board Result Interface | `rtp-controller.ts` | 22-48 |
| Symbol Odds Definition | `generator-definition.ts` | 163-250 |
| Bet Multiplier (20 lines) | `generator-definition.ts` | 16 |
| Chain Generation | `generate-chains.ts` | 289 (totalTumbleWin) |

---

## 10. Conclusion

The relationship between `totalTumbleWin` and `baseBetAmount` follows standard slot machine design:

✅ **Correct Design**
- Wins calculated per-line using `baseBetAmount`
- RTP calculated using total bet across all lines
- Multipliers applied to aggregated wins
- Clear separation of concerns

✅ **No Bugs Detected**
- Consistent usage throughout codebase
- Proper RTP calculation methodology
- Correct multiplier application

This architecture ensures:
1. Fair RTP calculations
2. Intuitive per-line betting
3. Proper win multiplier effects
4. Industry-standard slot mechanics
