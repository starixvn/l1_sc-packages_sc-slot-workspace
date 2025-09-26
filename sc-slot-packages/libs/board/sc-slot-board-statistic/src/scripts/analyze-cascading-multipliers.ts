#!/usr/bin/env ts-node

/**
 * Cascading Multiplier Analysis Script
 * Analyzes how symbol 10s cascade and get new multiplier values during tumbles
 */

import { readFileSync } from "fs";
import { join } from "path";

interface MultiplierAnalysis {
  batchId: number;
  roundId: number;
  multiplier: number;
  settlementResult: {
    tumbles: Array<{
      originalBoard: string;
      newBoard: string;
      multipliers: number[];
      icons: Record<string, any>;
      win: number;
      explodedSymbols?: number[];
      newSymbols?: number[];
    }>;
  };
}

function parseBoard(boardString: string): number[] {
  return boardString.split(',').map(Number);
}

function findSymbol10Positions(board: number[]): number[] {
  return board
    .map((symbol, pos) => symbol === 10 ? pos : -1)
    .filter(pos => pos !== -1);
}

function analyzeNewSymbol10s(originalBoard: number[], newBoard: number[], explodedSymbols?: number[], newSymbols?: number[]) {
  const originalSymbol10Positions = findSymbol10Positions(originalBoard);
  const newSymbol10Positions = findSymbol10Positions(newBoard);
  
  // Find which symbol 10s are newly added (not just moved from original positions)
  const newlyAddedSymbol10s: number[] = [];
  const cascadedSymbol10s: number[] = [];
  
  if (explodedSymbols && newSymbols) {
    // Check newSymbols array for newly added symbol 10s
    newSymbols.forEach((symbol, pos) => {
      if (symbol === 10) {
        newlyAddedSymbol10s.push(pos);
      }
    });
  }
  
  // Find symbol 10s that cascaded down (existed before but moved)
  newSymbol10Positions.forEach(pos => {
    if (!newlyAddedSymbol10s.includes(pos)) {
      // This symbol 10 was either in original position or cascaded down
      cascadedSymbol10s.push(pos);
    }
  });
  
  return {
    originalSymbol10Positions,
    newSymbol10Positions,
    newlyAddedSymbol10s: newlyAddedSymbol10s.sort((a, b) => a - b),
    cascadedSymbol10s: cascadedSymbol10s.sort((a, b) => a - b),
    totalNewSymbol10s: newlyAddedSymbol10s.length
  };
}

async function main() {
  try {
    console.log("🎰 Analyzing Cascading Multiplier Behavior...\n");
    
    // Read the latest multiplier data
    const filename = "multiplier-spins-2025-09-25T08-17-25-523Z.json";
    console.log(`📊 Analyzing: ${filename}`);
    const filePath = join(process.cwd(), 'chain-output', filename);
    const data = JSON.parse(readFileSync(filePath, 'utf8'));
    
    console.log(`Found ${data.multiplierSpins.length} qualifying spins\n`);
    
    // Analyze each spin
    data.multiplierSpins.forEach((spin: MultiplierAnalysis, index: number) => {
      console.log(`=== SPIN ${index + 1} (Batch ${spin.batchId}, Round ${spin.roundId}) ===`);
      console.log(`Final Multiplier: ${spin.multiplier}x`);
      console.log(`Tumbles: ${spin.settlementResult.tumbles.length}`);
      
      spin.settlementResult.tumbles.forEach((tumble, tumbleIndex) => {
        console.log(`\n--- Tumble ${tumbleIndex + 1} ---`);
        
        const originalBoard = parseBoard(tumble.originalBoard);
        const newBoard = parseBoard(tumble.newBoard);
        
        const analysis = analyzeNewSymbol10s(
          originalBoard, 
          newBoard, 
          tumble.explodedSymbols, 
          tumble.newSymbols
        );
        
        console.log(`Original symbol 10 positions: [${analysis.originalSymbol10Positions.join(', ')}]`);
        console.log(`New symbol 10 positions: [${analysis.newSymbol10Positions.join(', ')}]`);
        console.log(`Newly added symbol 10s: [${analysis.newlyAddedSymbol10s.join(', ')}]`);
        console.log(`Cascaded symbol 10s: [${analysis.cascadedSymbol10s.join(', ')}]`);
        console.log(`Multipliers array: [${tumble.multipliers.join(', ')}]`);
        
        console.log(`\n🔍 Cascading Analysis:`);
        console.log(`- Original symbol 10 count: ${analysis.originalSymbol10Positions.length}`);
        console.log(`- Newly added symbol 10 count: ${analysis.newlyAddedSymbol10s.length}`);
        console.log(`- Cascaded symbol 10 count: ${analysis.cascadedSymbol10s.length}`);
        console.log(`- Total new symbol 10 count: ${analysis.newSymbol10Positions.length}`);
        console.log(`- Multipliers array length: ${tumble.multipliers.length}`);
        
        // Test hypothesis: multipliers correspond to newly added symbol 10s
        if (analysis.newlyAddedSymbol10s.length === tumble.multipliers.length) {
          console.log(`✅ HYPOTHESIS 1: Multipliers match newly added symbol 10s!`);
          analysis.newlyAddedSymbol10s.forEach((pos, i) => {
            const row = Math.floor(pos / 6);
            const col = pos % 6;
            console.log(`  New symbol 10 at position ${pos} (Row ${row}, Col ${col}) → ${tumble.multipliers[i]}x`);
          });
        } else if (analysis.newSymbol10Positions.length === tumble.multipliers.length) {
          console.log(`✅ HYPOTHESIS 2: Multipliers match all symbol 10s on new board!`);
          analysis.newSymbol10Positions.forEach((pos, i) => {
            const row = Math.floor(pos / 6);
            const col = pos % 6;
            const isNewlyAdded = analysis.newlyAddedSymbol10s.includes(pos);
            const type = isNewlyAdded ? "NEW" : "CASCADED";
            console.log(`  Symbol 10 at position ${pos} (Row ${row}, Col ${col}) [${type}] → ${tumble.multipliers[i]}x`);
          });
        } else {
          console.log(`❌ MISMATCH: No clear pattern found`);
        }
        
        // Analyze cascading behavior
        if (tumble.explodedSymbols && tumble.newSymbols) {
          console.log(`\n🎯 Cascading Details:`);
          const explodedPositions = tumble.explodedSymbols
            .map((symbol, pos) => symbol !== -1 ? pos : -1)
            .filter(pos => pos !== -1);
          
          console.log(`Exploded positions: [${explodedPositions.join(', ')}]`);
          
          // Show what new symbols were added where
          const newSymbolDetails: string[] = [];
          tumble.newSymbols.forEach((symbol, pos) => {
            if (symbol !== -1) {
              newSymbolDetails.push(`pos ${pos}: symbol ${symbol}`);
            }
          });
          console.log(`New symbols added: ${newSymbolDetails.join(', ')}`);
        }
      });
      
      // Final analysis for the spin
      const finalTumble = spin.settlementResult.tumbles[spin.settlementResult.tumbles.length - 1];
      const finalOriginalBoard = parseBoard(finalTumble.originalBoard);
      const finalNewBoard = parseBoard(finalTumble.newBoard);
      
      const finalAnalysis = analyzeNewSymbol10s(
        finalOriginalBoard,
        finalNewBoard,
        finalTumble.explodedSymbols,
        finalTumble.newSymbols
      );
      
      console.log(`\n🎯 FINAL SPIN ANALYSIS:`);
      console.log(`Final board symbol 10 positions: [${finalAnalysis.newSymbol10Positions.join(', ')}]`);
      console.log(`Final newly added symbol 10s: [${finalAnalysis.newlyAddedSymbol10s.join(', ')}]`);
      console.log(`Final multipliers: [${finalTumble.multipliers.join(', ')}]`);
      
      if (finalAnalysis.newlyAddedSymbol10s.length === finalTumble.multipliers.length) {
        console.log(`✅ CONFIRMED: Final multipliers correspond to newly added symbol 10s`);
      } else if (finalAnalysis.newSymbol10Positions.length === finalTumble.multipliers.length) {
        console.log(`✅ CONFIRMED: Final multipliers correspond to all symbol 10s on board`);
      }
      
      console.log(`\n${'='.repeat(80)}\n`);
    });
    
    // Summary analysis
    console.log(`\n📈 SUMMARY ANALYSIS:`);
    
    let newlyAddedMatches = 0;
    let allSymbol10Matches = 0;
    let totalSpins = data.multiplierSpins.length;
    
    data.multiplierSpins.forEach((spin: MultiplierAnalysis) => {
      const finalTumble = spin.settlementResult.tumbles[spin.settlementResult.tumbles.length - 1];
      const finalOriginalBoard = parseBoard(finalTumble.originalBoard);
      const finalNewBoard = parseBoard(finalTumble.newBoard);
      
      const analysis = analyzeNewSymbol10s(
        finalOriginalBoard,
        finalNewBoard,
        finalTumble.explodedSymbols,
        finalTumble.newSymbols
      );
      
      if (analysis.newlyAddedSymbol10s.length === finalTumble.multipliers.length) {
        newlyAddedMatches++;
      }
      
      if (analysis.newSymbol10Positions.length === finalTumble.multipliers.length) {
        allSymbol10Matches++;
      }
    });
    
    console.log(`Spins where multipliers match newly added symbol 10s: ${newlyAddedMatches}/${totalSpins}`);
    console.log(`Spins where multipliers match all symbol 10s on board: ${allSymbol10Matches}/${totalSpins}`);
    
    console.log(`\n🎯 CASCADING MULTIPLIER RULES:`);
    
    if (newlyAddedMatches === totalSpins) {
      console.log(`✅ RULE: Multipliers array corresponds to NEWLY ADDED symbol 10s only`);
      console.log(`- Cascaded (moved) symbol 10s retain their previous multiplier values`);
      console.log(`- Only freshly added symbol 10s get new multiplier values`);
      console.log(`- Array index follows position order of newly added symbol 10s`);
    } else if (allSymbol10Matches === totalSpins) {
      console.log(`✅ RULE: Multipliers array corresponds to ALL symbol 10s on the board`);
      console.log(`- All symbol 10s (cascaded + newly added) get multiplier values`);
      console.log(`- Array index follows position order of all symbol 10s on final board`);
    } else {
      console.log(`❓ MIXED BEHAVIOR: Need more analysis to determine the exact rule`);
    }
    
    console.log(`\n💡 INSERTION GUIDELINES:`);
    console.log(`1. Track which symbol 10s are newly added vs cascaded during each tumble`);
    console.log(`2. New multiplier values should be assigned based on the cascading rule identified above`);
    console.log(`3. Use position-based ordering for array indexing within the applicable symbol 10 set`);
    
  } catch (error) {
    console.error('Analysis failed:', error);
    throw error;
  }
}

// Run the analysis
main().catch(console.error);

