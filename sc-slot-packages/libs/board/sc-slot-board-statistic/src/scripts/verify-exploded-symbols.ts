#!/usr/bin/env ts-node

/**
 * Exploded Symbols Verification Script
 * 
 * Validates explodedSymbols data integrity in generated chain files.
 * Run this after generating chains to ensure correctness.
 * 
 * Usage:
 *   npm run verify-exploded-symbols                    # Validate latest chain
 *   npm run verify-exploded-symbols -- latest         # Validate latest chain  
 *   npm run verify-exploded-symbols -- all           # Validate all chains
 *   npm run verify-exploded-symbols -- file.json     # Validate specific file
 */

import { ExplodedSymbolsValidator } from '../utils/exploded-symbols-validator.js';
import path from 'path';
import { fileURLToPath } from 'url';

async function main() {
    console.log('🔍 Exploded Symbols Verification Tool');
    console.log('====================================\n');

    const args = process.argv.slice(2);
    const mode = args[0] || 'latest';

    try {
        if (mode === 'all') {
            // Validate all chain files
            console.log('📂 Validating all chain files...\n');
            
            const results = ExplodedSymbolsValidator.validateAllChains('./chain-output');
            
            if (results.length === 0) {
                console.log('⚠️  No chain files found to validate.');
                return;
            }

            let totalValid = 0;
            let totalInvalid = 0;

            results.forEach((result, index) => {
                console.log(`\n[${index + 1}/${results.length}] ${result.fileName}:`);
                
                if (result.isValid) {
                    totalValid++;
                    console.log(`✅ VALID - ${result.validExplodedSymbols}/${result.tumblesWithWins} tumbles validated`);
                } else {
                    totalInvalid++;
                    console.log(`❌ INVALID - ${result.errors.length} errors found`);
                    result.errors.slice(0, 3).forEach(error => {
                        console.log(`   • ${error}`);
                    });
                    if (result.errors.length > 3) {
                        console.log(`   • ... and ${result.errors.length - 3} more errors`);
                    }
                }
            });

            console.log(`\n📊 Overall Results:`);
            console.log(`   Valid Chains: ${totalValid}/${results.length}`);
            console.log(`   Invalid Chains: ${totalInvalid}/${results.length}`);
            console.log(`   Success Rate: ${((totalValid / results.length) * 100).toFixed(1)}%`);

            if (totalValid === results.length) {
                console.log(`\n🎉 ALL CHAINS VALIDATED SUCCESSFULLY!`);
                console.log(`   explodedSymbols data integrity is perfect across all chains.`);
            } else {
                console.log(`\n⚠️  Some chains have validation issues that need attention.`);
            }

        } else if (mode === 'latest' || mode === '') {
            // Validate latest chain
            console.log('📂 Validating latest chain file...\n');
            
            const result = ExplodedSymbolsValidator.validateLatestChain('./chain-output');
            
            console.log(result.summary);
            
            if (result.errors.length > 0) {
                console.log(`\n❌ Validation Errors:`);
                result.errors.forEach((error, index) => {
                    console.log(`   ${index + 1}. ${error}`);
                });
            }

            if (result.warnings.length > 0) {
                console.log(`\n⚠️  Warnings:`);
                result.warnings.forEach((warning, index) => {
                    console.log(`   ${index + 1}. ${warning}`);
                });
            }

            if (result.isValid) {
                console.log(`\n🎉 VALIDATION SUCCESSFUL!`);
                console.log(`   All explodedSymbols data is correct and consistent.`);
                console.log(`   Chain is ready for production use.`);
            } else {
                console.log(`\n❌ VALIDATION FAILED!`);
                console.log(`   Data integrity issues found. Please review and fix.`);
                process.exit(1);
            }

        } else {
            // Validate specific file
            const filePath = path.resolve('./chain-output', mode);
            console.log(`📂 Validating specific file: ${mode}\n`);
            
            const result = ExplodedSymbolsValidator.validateChainFile(filePath);
            
            console.log(result.summary);
            
            if (result.errors.length > 0) {
                console.log(`\n❌ Validation Errors:`);
                result.errors.forEach((error, index) => {
                    console.log(`   ${index + 1}. ${error}`);
                });
            }

            if (result.warnings.length > 0) {
                console.log(`\n⚠️  Warnings:`);
                result.warnings.forEach((warning, index) => {
                    console.log(`   ${index + 1}. ${warning}`);
                });
            }

            if (result.isValid) {
                console.log(`\n🎉 VALIDATION SUCCESSFUL!`);
            } else {
                console.log(`\n❌ VALIDATION FAILED!`);
                process.exit(1);
            }
        }

    } catch (error: any) {
        console.error('💥 Verification script failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Show help
function showHelp() {
    console.log(`
Exploded Symbols Verification Tool

This tool validates the integrity of explodedSymbols data in generated chain files.
It ensures that:
- explodedSymbols arrays have correct length (30 elements)
- Exploded positions match original board positions exactly  
- Symbol counts in icons data match exploded symbol counts
- Position mappings are 100% accurate
- Bet data calculations are correct

Usage:
  npm run verify-exploded-symbols                    # Validate latest chain
  npm run verify-exploded-symbols -- latest         # Validate latest chain  
  npm run verify-exploded-symbols -- all           # Validate all chains
  npm run verify-exploded-symbols -- file.json     # Validate specific file
  npm run verify-exploded-symbols -- --help        # Show this help

Examples:
  npm run verify-exploded-symbols
  npm run verify-exploded-symbols -- all
  npm run verify-exploded-symbols -- tease-100boards-1757485660704.json

This tool should be run after every chain generation to ensure data correctness.
`);
}

// ES Module entry point check
const __filename = fileURLToPath(import.meta.url);

// Check if this script is being run directly
if (process.argv[1] === __filename) {
    const args = process.argv.slice(2);
    if (args.includes('--help') || args.includes('-h')) {
        showHelp();
    } else {
        main().catch(error => {
            console.error('💥 Unexpected error:', error);
            process.exit(1);
        });
    }
}
