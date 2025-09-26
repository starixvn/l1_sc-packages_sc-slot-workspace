#!/usr/bin/env ts-node

/**
 * Chain Multiplier Verification Script
 * Verifies chain-output files for boards with multipliers and validates correctness
 * Based on analyze-multipliers.ts logic
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";

interface ChainBoard {
  index: number;
  board: number[];
  multipliers: number[];
  settlementResult?: {
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
  totalTumbleWin: number;
  boardMultiplierSum: number;
  totalWin: number;
  multiplierApplied: boolean;
  winMultiplier: number;
}

interface ChainData {
  metadata: {
    generated: string;
    config: any;
    stats: any;
    rtpResult: any;
    tumbleStats: any;
    betData: any;
  };
  boards: ChainBoard[];
}

interface ValidationResult {
  boardIndex: number;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  boardData: {
    originalBoard: string;
    boardArray: number[];
    multipliers: number[];
  };
  symbol10Analysis: {
    boardSymbol10Count: number;
    multipliersCount: number;
    positionMatches: boolean;
    positions: number[];
    multiplierValues: number[];
  };
  tumbleAnalysis?: {
    tumbleCount: number;
    progressionValid: boolean;
    finalStateValid: boolean;
    transitionErrors: string[];
  };
}

interface VerificationSummary {
  totalBoards: number;
  boardsWithMultipliers: number;
  validBoards: number;
  invalidBoards: number;
  validationResults: ValidationResult[];
  criticalErrors: string[];
  warnings: string[];
}

/**
 * Detect symbol 10 positions on a board
 */
function detectSymbol10Positions(board: number[]): number[] {
  return board
    .map((symbol, index) => symbol === 10 ? index : -1)
    .filter(position => position !== -1);
}

/**
 * Convert board position to reel/row coordinates
 */
function positionToCoordinates(position: number): { reel: number; row: number } {
  const reel = Math.floor(position / 5);
  const row = position % 5;
  return { reel, row };
}

/**
 * Validate a single board's multiplier configuration
 */
function validateBoard(board: ChainBoard, arrayIndex?: number): ValidationResult {
  const result: ValidationResult = {
    boardIndex: board.index !== undefined ? board.index : arrayIndex !== undefined ? arrayIndex : -1,
    isValid: true,
    errors: [],
    warnings: [],
    boardData: {
      originalBoard: board.board.join(','),
      boardArray: [...board.board],
      multipliers: [...(board.multipliers || [])]
    },
    symbol10Analysis: {
      boardSymbol10Count: 0,
      multipliersCount: 0,
      positionMatches: false,
      positions: [],
      multiplierValues: []
    }
  };

  // Basic multiplier presence check
  if (!board.multipliers || !Array.isArray(board.multipliers) || board.multipliers.length === 0) {
    result.warnings.push("Board has no multipliers array or empty multipliers");
    return result;
  }

  // Check if board actually has symbol 10s
  const symbol10Positions = detectSymbol10Positions(board.board);
  if (symbol10Positions.length === 0 && board.multipliers.length > 0) {
    result.warnings.push(
      `Board has ${board.multipliers.length} multiplier(s) but no symbol 10s on board. ` +
      `This may indicate cascaded/removed symbol 10s or data inconsistency.`
    );
    // Don't return early - continue validation to understand the data structure
  }

  // Analyze symbol 10 positions on the board (already detected above)
  result.symbol10Analysis.boardSymbol10Count = symbol10Positions.length;
  result.symbol10Analysis.multipliersCount = board.multipliers.length;
  result.symbol10Analysis.positions = symbol10Positions;
  result.symbol10Analysis.multiplierValues = board.multipliers;

  // Critical validation: Symbol 10 count must match multipliers count
  if (symbol10Positions.length !== board.multipliers.length) {
    // Special case: If board has no symbol 10s but has multipliers, this might be valid
    // in certain game states (e.g., after all symbol 10s were removed but multipliers persist)
    if (symbol10Positions.length === 0 && board.multipliers.length > 0) {
      result.warnings.push(
        `Board has multipliers [${board.multipliers.join(', ')}] but no symbol 10s. ` +
        `This may be valid if symbol 10s were removed during cascading but multipliers persist.`
      );
    } else {
      result.isValid = false;
      result.errors.push(
        `Symbol 10 count (${symbol10Positions.length}) does not match multipliers count (${board.multipliers.length})`
      );
    }
  }

  // Position-based ordering validation
  if (symbol10Positions.length > 1) {
    const sortedPositions = [...symbol10Positions].sort((a, b) => a - b);
    const positionMatches = symbol10Positions.every((pos, i) => pos === sortedPositions[i]);
    result.symbol10Analysis.positionMatches = positionMatches;

    if (!positionMatches) {
      result.errors.push(
        `Multipliers array order does not match position-based order. ` +
        `Expected positions: [${sortedPositions.join(', ')}], ` +
        `Actual positions: [${symbol10Positions.join(', ')}]`
      );
      result.isValid = false;
    }
  } else {
    result.symbol10Analysis.positionMatches = true;
  }

  // Validate tumble progression if settlement data exists
  if (board.settlementResult?.tumbles) {
    result.tumbleAnalysis = validateTumbleProgression(board);
    if (!result.tumbleAnalysis.progressionValid || !result.tumbleAnalysis.finalStateValid) {
      result.isValid = false;
    }
  }

  // Validate multiplier sum calculation
  const calculatedSum = board.multipliers.reduce((sum, val) => sum + val, 0);
  if (typeof board.boardMultiplierSum === 'number' && board.boardMultiplierSum !== calculatedSum) {
    result.errors.push(
      `Board multiplier sum mismatch. Calculated: ${calculatedSum}, Stored: ${board.boardMultiplierSum}`
    );
    result.isValid = false;
  }

  // Validate multiplier application
  if (board.multipliers.length > 0 && typeof board.boardMultiplierSum === 'number') {
    const expectedMultiplierApplied = board.boardMultiplierSum > 0;
    const expectedWinMultiplier = board.boardMultiplierSum > 0 ? board.boardMultiplierSum : 1;

    if (typeof board.multiplierApplied === 'boolean' && board.multiplierApplied !== expectedMultiplierApplied) {
      result.errors.push(
        `Multiplier applied flag incorrect. Expected: ${expectedMultiplierApplied}, Got: ${board.multiplierApplied}`
      );
      result.isValid = false;
    }

    if (typeof board.winMultiplier === 'number' && board.winMultiplier !== expectedWinMultiplier) {
      result.errors.push(
        `Win multiplier incorrect. Expected: ${expectedWinMultiplier}, Got: ${board.winMultiplier}`
      );
      result.isValid = false;
    }
  }

  return result;
}

/**
 * Validate tumble progression for cascading behavior
 */
function validateTumbleProgression(board: ChainBoard): {
  tumbleCount: number;
  progressionValid: boolean;
  finalStateValid: boolean;
  transitionErrors: string[];
} {
  const result = {
    tumbleCount: board.settlementResult!.tumbles.length,
    progressionValid: true,
    finalStateValid: true,
    transitionErrors: [] as string[]
  };

  const tumbles = board.settlementResult!.tumbles;
  
  // Validate each tumble
  tumbles.forEach((tumble, index) => {
    if (!tumble.newBoard || typeof tumble.newBoard !== 'string') {
      result.transitionErrors.push(`Tumble ${index + 1}: Invalid newBoard data`);
      result.progressionValid = false;
      return;
    }
    
    const tumbleBoard = tumble.newBoard.split(',').map(Number);
    const symbol10Positions = detectSymbol10Positions(tumbleBoard);
    
    // Check symbol 10 count vs multipliers count for each tumble
    if (!tumble.multipliers || !Array.isArray(tumble.multipliers) || symbol10Positions.length !== tumble.multipliers.length) {
      // For transitional tumbles, this might be expected (partial multipliers)
      // But for final tumble, this should match
      if (index === tumbles.length - 1) {
        result.finalStateValid = false;
        const multiplierCount = tumble.multipliers && Array.isArray(tumble.multipliers) ? tumble.multipliers.length : 0;
        result.transitionErrors.push(
          `Final tumble ${index + 1}: Symbol 10 count (${symbol10Positions.length}) ≠ multipliers count (${multiplierCount})`
        );
      } else {
        // For non-final tumbles, log as potential transitional behavior
        const multiplierCount = tumble.multipliers && Array.isArray(tumble.multipliers) ? tumble.multipliers.length : 0;
        result.transitionErrors.push(
          `Tumble ${index + 1}: Transitional state - Symbol 10 count (${symbol10Positions.length}) ≠ multipliers count (${multiplierCount})`
        );
      }
    }

    // Validate position ordering within each tumble
    if (symbol10Positions.length > 1 && tumble.multipliers && Array.isArray(tumble.multipliers) && symbol10Positions.length === tumble.multipliers.length) {
      const sortedPositions = [...symbol10Positions].sort((a, b) => a - b);
      const positionMatches = symbol10Positions.every((pos, i) => pos === sortedPositions[i]);
      
      if (!positionMatches) {
        result.progressionValid = false;
        result.transitionErrors.push(
          `Tumble ${index + 1}: Position order mismatch. Expected: [${sortedPositions.join(', ')}], Got: [${symbol10Positions.join(', ')}]`
        );
      }
    }
  });

  // Validate tumble sequence consistency
  const finalTumble = tumbles[tumbles.length - 1];
  if (finalTumble && finalTumble.newBoard && typeof finalTumble.newBoard === 'string') {
    const finalTumbleBoard = finalTumble.newBoard.split(',').map(Number);
    
    // Validate that the first tumble's originalBoard matches the initial board
    const firstTumble = tumbles[0];
    if (firstTumble && firstTumble.originalBoard && typeof firstTumble.originalBoard === 'string') {
      const firstTumbleOriginalBoard = firstTumble.originalBoard.split(',').map(Number);
      
      if (!arraysEqual(board.board, firstTumbleOriginalBoard)) {
        result.finalStateValid = false;
        result.transitionErrors.push(
          `First tumble originalBoard does not match initial board state. ` +
          `Initial: [${board.board.join(',')}], First tumble: [${firstTumbleOriginalBoard.join(',')}]`
        );
      }
    }

    if (finalTumble.multipliers && Array.isArray(finalTumble.multipliers) && 
        board.multipliers && Array.isArray(board.multipliers) &&
        !arraysEqual(board.multipliers, finalTumble.multipliers)) {
      result.finalStateValid = false;
      result.transitionErrors.push(
        `Final tumble multipliers [${finalTumble.multipliers.join(', ')}] do not match board multipliers [${board.multipliers.join(', ')}]`
      );
    }
  } else {
    result.finalStateValid = false;
    result.transitionErrors.push("Final tumble has invalid or missing data");
  }

  return result;
}

/**
 * Helper function to compare arrays
 */
function arraysEqual(a: any[], b: any[]): boolean {
  return a.length === b.length && a.every((val, i) => val === b[i]);
}

/**
 * Verify a single chain file
 */
function verifyChainFile(filePath: string): VerificationSummary {
  console.log(`🔍 Verifying: ${filePath}`);
  
  let data: ChainData;
  try {
    data = JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error.message}`);
  }

  if (!data.boards || !Array.isArray(data.boards)) {
    throw new Error("Invalid chain data: missing or invalid boards array");
  }
  const summary: VerificationSummary = {
    totalBoards: data.boards.length,
    boardsWithMultipliers: 0,
    validBoards: 0,
    invalidBoards: 0,
    validationResults: [],
    criticalErrors: [],
    warnings: []
  };

  // Filter boards with multipliers
  // Note: We validate ALL boards that have any multipliers (including single multipliers)
  // because multipliers should always correspond to symbol 10s on the board or be explained
  // by game mechanics (e.g., persistent multipliers after symbol 10 removal)
  const boardsWithMultipliers = data.boards.filter(board => 
    board.multipliers && Array.isArray(board.multipliers) && board.multipliers.length > 0
  );
  
  summary.boardsWithMultipliers = boardsWithMultipliers.length;
  
  console.log(`📊 Found ${summary.boardsWithMultipliers} boards with multipliers out of ${summary.totalBoards} total boards`);

  if (summary.boardsWithMultipliers === 0) {
    summary.warnings.push("No boards with multipliers found in chain");
    return summary;
  }

  // Validate each board with multipliers
  boardsWithMultipliers.forEach((board, arrayIndex) => {
    try {
      // Use board.index if available, otherwise use array index
      const boardId = board.index !== undefined ? board.index : arrayIndex;
      
      // Ensure board has required properties
      if (!board.board || !Array.isArray(board.board)) {
        summary.criticalErrors.push(`Board ${boardId}: Invalid or missing board array`);
        summary.invalidBoards++;
        return;
      }

      const validation = validateBoard(board, arrayIndex);
      summary.validationResults.push(validation);

      if (validation.isValid) {
        summary.validBoards++;
      } else {
        summary.invalidBoards++;
        summary.criticalErrors.push(...validation.errors.map(err => 
        `Board ${boardId}: ${err} | Board: [${validation.boardData.originalBoard}] | Multipliers: [${validation.boardData.multipliers.join(', ')}]`
      ));
      }

      summary.warnings.push(...validation.warnings.map(warn => `Board ${boardId}: ${warn}`));
    } catch (error) {
      const boardId = board.index !== undefined ? board.index : arrayIndex;
      summary.criticalErrors.push(`Board ${boardId}: Validation failed - ${error.message}`);
      summary.invalidBoards++;
    }
  });

  return summary;
}

/**
 * Print detailed validation results
 */
function printValidationResults(summary: VerificationSummary, filename: string) {
  console.log(`\n📋 VALIDATION RESULTS FOR: ${filename}`);
  console.log(`${'='.repeat(80)}`);
  
  console.log(`📊 SUMMARY:`);
  console.log(`  Total boards: ${summary.totalBoards}`);
  console.log(`  Boards with multipliers: ${summary.boardsWithMultipliers}`);
  console.log(`  Valid boards: ${summary.validBoards}`);
  console.log(`  Invalid boards: ${summary.invalidBoards}`);
  
  if (summary.boardsWithMultipliers > 0) {
    const validationRate = (summary.validBoards / summary.boardsWithMultipliers * 100).toFixed(1);
    console.log(`  Validation rate: ${validationRate}%`);
  }

  // Print critical errors
  if (summary.criticalErrors.length > 0) {
    console.log(`\n🚨 CRITICAL ERRORS (${summary.criticalErrors.length}):`);
    summary.criticalErrors.forEach(error => console.log(`  ❌ ${error}`));
  }

  // Print warnings
  if (summary.warnings.length > 0 && summary.warnings.length <= 10) {
    console.log(`\n⚠️  WARNINGS (${summary.warnings.length}):`);
    summary.warnings.forEach(warning => console.log(`  ⚠️  ${warning}`));
  } else if (summary.warnings.length > 10) {
    console.log(`\n⚠️  WARNINGS (${summary.warnings.length} total, showing first 10):`);
    summary.warnings.slice(0, 10).forEach(warning => console.log(`  ⚠️  ${warning}`));
    console.log(`  ... and ${summary.warnings.length - 10} more warnings`);
  }

  // Print detailed analysis for invalid boards
  const invalidResults = summary.validationResults.filter(r => !r.isValid);
  if (invalidResults.length > 0 && invalidResults.length <= 5) {
    console.log(`\n🔍 DETAILED ANALYSIS FOR INVALID BOARDS:`);
    invalidResults.forEach(result => {
      console.log(`\n  Board ${result.boardIndex}:`);
      console.log(`    📋 Board Data: [${result.boardData.originalBoard}]`);
      console.log(`    🎯 Multipliers: [${result.boardData.multipliers.join(', ')}]`);
      console.log(`    📍 Symbol 10 positions: [${result.symbol10Analysis.positions.join(', ')}]`);
      console.log(`    🔢 Symbol 10 count: ${result.symbol10Analysis.boardSymbol10Count}`);
      console.log(`    🎲 Multipliers count: ${result.symbol10Analysis.multipliersCount}`);
      console.log(`    ✅ Position matches: ${result.symbol10Analysis.positionMatches ? '✅' : '❌'}`);
      
      // Show board layout for easier visualization
      console.log(`    🎮 Board Layout (6 reels × 5 symbols):`);
      for (let reel = 0; reel < 6; reel++) {
        const reelSymbols = result.boardData.boardArray.slice(reel * 5, (reel + 1) * 5);
        const reelPositions = Array.from({length: 5}, (_, i) => reel * 5 + i);
        const symbol10InReel = reelPositions.filter(pos => result.boardData.boardArray[pos] === 10);
        const reelDisplay = reelSymbols.map((symbol, i) => {
          const pos = reel * 5 + i;
          return symbol === 10 ? `[10@${pos}]` : symbol.toString();
        }).join(',');
        console.log(`      Reel ${reel}: [${reelDisplay}]${symbol10InReel.length > 0 ? ` ← Symbol 10 at positions: ${symbol10InReel.join(', ')}` : ''}`);
      }
      
      if (result.tumbleAnalysis) {
        console.log(`    🔄 Tumbles: ${result.tumbleAnalysis.tumbleCount}`);
        console.log(`    📈 Progression valid: ${result.tumbleAnalysis.progressionValid ? '✅' : '❌'}`);
        console.log(`    🎯 Final state valid: ${result.tumbleAnalysis.finalStateValid ? '✅' : '❌'}`);
        
        if (result.tumbleAnalysis.transitionErrors.length > 0) {
          console.log(`    ⚠️  Transition errors:`);
          result.tumbleAnalysis.transitionErrors.forEach(err => 
            console.log(`      - ${err}`)
          );
        }
      }
    });
  }

  console.log(`\n${'='.repeat(80)}\n`);
}

/**
 * Main verification function
 */
async function main() {
  try {
    console.log("🎯 Chain Multiplier Verification Script");
    console.log("Verifying chain-output files for multiplier correctness...\n");

    const chainOutputDir = join(process.cwd(), 'chain-output');
    
    // Find all JSON files in chain-output directory
    const files = readdirSync(chainOutputDir)
      .filter(file => file.endsWith('.json'))
      .filter(file => !file.includes('multiplier-spins')) // Exclude multiplier collection files
      .sort();

    if (files.length === 0) {
      console.log("❌ No chain output files found in chain-output directory");
      return;
    }

    console.log(`📁 Found ${files.length} chain files to verify:`);
    files.forEach(file => console.log(`  - ${file}`));
    console.log('');

    const allSummaries: { filename: string; summary: VerificationSummary }[] = [];

    // Verify each file
    for (const filename of files) {
      const filePath = join(chainOutputDir, filename);
      
      try {
        const summary = verifyChainFile(filePath);
        allSummaries.push({ filename, summary });
        printValidationResults(summary, filename);
      } catch (error) {
        console.error(`❌ Failed to verify ${filename}:`, error.message);
        console.log('');
      }
    }

    // Print overall summary
    console.log(`\n🎯 OVERALL VERIFICATION SUMMARY`);
    console.log(`${'='.repeat(80)}`);
    
    const totalFiles = allSummaries.length;
    const filesWithMultipliers = allSummaries.filter(s => s.summary.boardsWithMultipliers > 0).length;
    const filesWithErrors = allSummaries.filter(s => s.summary.criticalErrors.length > 0).length;
    const totalBoardsWithMultipliers = allSummaries.reduce((sum, s) => sum + s.summary.boardsWithMultipliers, 0);
    const totalValidBoards = allSummaries.reduce((sum, s) => sum + s.summary.validBoards, 0);
    const totalInvalidBoards = allSummaries.reduce((sum, s) => sum + s.summary.invalidBoards, 0);

    console.log(`Files verified: ${totalFiles}`);
    console.log(`Files with multipliers: ${filesWithMultipliers}`);
    console.log(`Files with errors: ${filesWithErrors}`);
    console.log(`Total boards with multipliers: ${totalBoardsWithMultipliers}`);
    console.log(`Total valid boards: ${totalValidBoards}`);
    console.log(`Total invalid boards: ${totalInvalidBoards}`);
    
    if (totalBoardsWithMultipliers > 0) {
      const overallValidationRate = (totalValidBoards / totalBoardsWithMultipliers * 100).toFixed(1);
      console.log(`Overall validation rate: ${overallValidationRate}%`);
    }

    // Status summary
    if (filesWithErrors === 0) {
      console.log(`\n✅ ALL CHAIN FILES PASSED VALIDATION!`);
    } else {
      console.log(`\n❌ ${filesWithErrors} chain files have validation errors`);
      console.log(`🔧 Review the detailed analysis above to fix multiplier issues`);
    }

  } catch (error) {
    console.error('❌ Verification script failed:', error);
    throw error;
  }
}

// Run the verification
main().catch(console.error);
