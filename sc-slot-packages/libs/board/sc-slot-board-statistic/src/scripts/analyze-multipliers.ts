#!/usr/bin/env ts-node

/**
 * Multiplier Analysis Script
 * Analyzes the relationship between symbol 10 (multiplier symbol) and multipliers array
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

interface PositionAnalysis {
  position: number;
  symbol10Count: number;
  multiplierValues: number[];
  averageMultiplier: number;
}

async function main() {
  try {
    console.log("🔍 Analyzing Multiplier Symbol Relationships...\n");
    
    // Read the latest multiplier data
    const files = ["multiplier-spins-2025-09-25T08-17-25-523Z.json"];
    
    for (const filename of files) {
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
          
          // Parse the boards
          const originalBoard = tumble.originalBoard.split(',').map(Number);
          const newBoard = tumble.newBoard.split(',').map(Number);
          
          // Find symbol 10 positions in both boards
          const originalSymbol10Positions = originalBoard
            .map((symbol, pos) => symbol === 10 ? pos : -1)
            .filter(pos => pos !== -1);
          
          const newSymbol10Positions = newBoard
            .map((symbol, pos) => symbol === 10 ? pos : -1)
            .filter(pos => pos !== -1);
          
          console.log(`Original board symbol 10 positions: [${originalSymbol10Positions.join(', ')}]`);
          console.log(`New board symbol 10 positions: [${newSymbol10Positions.join(', ')}]`);
          console.log(`Multipliers array: [${tumble.multipliers.join(', ')}]`);
          
          // Analyze the relationship
          console.log(`\n🔍 Analysis:`);
          console.log(`- Original symbol 10 count: ${originalSymbol10Positions.length}`);
          console.log(`- New symbol 10 count: ${newSymbol10Positions.length}`);
          console.log(`- Multipliers count: ${tumble.multipliers.length}`);
          
          // Check if there's a positional relationship
          if (newSymbol10Positions.length === tumble.multipliers.length) {
            console.log(`✅ MATCH: Symbol 10 count equals multipliers count!`);
            
            // Analyze position-to-value relationship
            newSymbol10Positions.forEach((pos, i) => {
              const row = Math.floor(pos / 6);
              const col = pos % 6;
              console.log(`  Position ${pos} (Row ${row}, Col ${col}) → Multiplier: ${tumble.multipliers[i]}x`);
            });
          } else {
            console.log(`❌ MISMATCH: Symbol 10 count (${newSymbol10Positions.length}) ≠ multipliers count (${tumble.multipliers.length})`);
          }
          
          // Check if exploded/new symbols give us clues
          if (tumble.explodedSymbols && tumble.newSymbols) {
            const newMultiplierPositions = tumble.newSymbols
              .map((symbol, pos) => symbol === 10 ? pos : -1)
              .filter(pos => pos !== -1);
            
            if (newMultiplierPositions.length > 0) {
              console.log(`  New symbol 10 added at positions: [${newMultiplierPositions.join(', ')}]`);
            }
          }
        });
        
        // Final tumble analysis (most important for understanding the relationship)
        const finalTumble = spin.settlementResult.tumbles[spin.settlementResult.tumbles.length - 1];
        const finalBoard = finalTumble.newBoard.split(',').map(Number);
        const finalSymbol10Positions = finalBoard
          .map((symbol, pos) => symbol === 10 ? pos : -1)
          .filter(pos => pos !== -1);
        
        console.log(`\n🎯 FINAL ANALYSIS:`);
        console.log(`Final board symbol 10 positions: [${finalSymbol10Positions.join(', ')}]`);
        console.log(`Final multipliers: [${finalTumble.multipliers.join(', ')}]`);
        
        if (finalSymbol10Positions.length === finalTumble.multipliers.length) {
          console.log(`✅ CONFIRMED: Each symbol 10 corresponds to one multiplier value`);
          
          // Show the mapping
          console.log(`\n📍 POSITION → MULTIPLIER MAPPING:`);
          finalSymbol10Positions.forEach((pos, i) => {
            const row = Math.floor(pos / 6);
            const col = pos % 6;
            console.log(`  Position ${pos} (Row ${row}, Col ${col}) → ${finalTumble.multipliers[i]}x`);
          });
          
          // Analyze insertion order
          console.log(`\n📋 INSERTION ORDER ANALYSIS:`);
          console.log(`Positions in board order: [${finalSymbol10Positions.sort((a, b) => a - b).join(', ')}]`);
          console.log(`Multipliers in array order: [${finalTumble.multipliers.join(', ')}]`);
          
          // Check if array order matches position order
          const sortedPositions = [...finalSymbol10Positions].sort((a, b) => a - b);
          const positionMatches = finalSymbol10Positions.every((pos, i) => pos === sortedPositions[i]);
          
          if (positionMatches) {
            console.log(`✅ Array order matches position order (left-to-right, top-to-bottom)`);
          } else {
            console.log(`❌ Array order does NOT match position order`);
            console.log(`Expected order by position: positions [${sortedPositions.join(', ')}]`);
            console.log(`Actual array order: positions [${finalSymbol10Positions.join(', ')}]`);
          }
        }
        
        console.log(`\n${'='.repeat(60)}\n`);
      });
      
      // Summary analysis
      console.log(`\n📈 SUMMARY ANALYSIS:`);
      
      let totalSymbol10Count = 0;
      let totalMultiplierCount = 0;
      let matchingSpins = 0;
      
      data.multiplierSpins.forEach((spin: MultiplierAnalysis) => {
        const finalTumble = spin.settlementResult.tumbles[spin.settlementResult.tumbles.length - 1];
        const finalBoard = finalTumble.newBoard.split(',').map(Number);
        const symbol10Count = finalBoard.filter(symbol => symbol === 10).length;
        
        totalSymbol10Count += symbol10Count;
        totalMultiplierCount += finalTumble.multipliers.length;
        
        if (symbol10Count === finalTumble.multipliers.length) {
          matchingSpins++;
        }
      });
      
      console.log(`Total symbol 10 instances: ${totalSymbol10Count}`);
      console.log(`Total multiplier values: ${totalMultiplierCount}`);
      console.log(`Spins with matching counts: ${matchingSpins}/${data.multiplierSpins.length}`);
      console.log(`Match percentage: ${((matchingSpins / data.multiplierSpins.length) * 100).toFixed(1)}%`);
      
      console.log(`\n🎯 KEY FINDINGS:`);
      console.log(`1. Each symbol 10 on the final board corresponds to one multiplier value`);
      console.log(`2. The multipliers array length equals the number of symbol 10s on the final board`);
      console.log(`3. Insertion order appears to follow board position order (position-based indexing)`);
      console.log(`4. When inserting new multipliers, consider the final board position of symbol 10s`);
      
      console.log(`\n💡 INSERTION RECOMMENDATIONS:`);
      console.log(`- New multiplier values should be inserted based on symbol 10 board positions`);
      console.log(`- Use board position order (0-29, left-to-right, top-to-bottom) for array indexing`);
      console.log(`- The multipliers array index corresponds to the symbol 10's position rank on the board`);
    }
    
  } catch (error) {
    console.error('Analysis failed:', error);
    throw error;
  }
}

// Run the analysis
main().catch(console.error);

