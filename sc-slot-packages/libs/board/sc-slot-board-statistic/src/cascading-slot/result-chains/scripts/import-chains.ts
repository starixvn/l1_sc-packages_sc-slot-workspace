#!/usr/bin/env ts-node

/**
 * Chain Database Import Script  
 * Scans JSON files from generate-chains output and imports them into MongoDB
 */

import { connectDatabase } from '../database/connection';
import { ResultChainRepository, CreateResultChainInput } from '../database/repositories/result-chain-repository';
import { ResultChainStatisticsRepository, CreateResultChainStatisticsInput } from '../database/repositories/result-chain-statistics-repository';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, extname } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Convert volatility string name to numeric enum value
 * Volatility enum: Low=1, MediumLow=2, Medium=3, High=4, VeryHigh=5
 */
function convertVolatilityToNumber(volatility: string | number | undefined): number {
    // If already a number, return it
    if (typeof volatility === 'number') {
        return volatility;
    }
    
    // If undefined or invalid, default to MediumLow (2)
    if (!volatility) {
        console.warn('⚠️  Volatility not specified, defaulting to MediumLow (2)');
        return 2;
    }
    
    // Convert string name to number
    const volatilityMap: { [key: string]: number } = {
        'Low': 1,
        'MediumLow': 2,
        'Medium': 3,
        'High': 4,
        'VeryHigh': 5,
        // Also support numeric strings
        '1': 1,
        '2': 2,
        '3': 3,
        '4': 4,
        '5': 5
    };
    
    const value = volatilityMap[volatility];
    if (value === undefined) {
        console.warn(`⚠️  Unknown volatility '${volatility}', defaulting to MediumLow (2)`);
        return 2;
    }
    
    return value;
}

interface ImportConfig {
    inputDir: string;
    batchSize: number;
    skipExisting: boolean;
    statusFilter: ('active' | 'testing' | 'archived')[];
    createdByFilter?: string;
}

interface ImportStats {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
    errors: string[];
}

async function main() {
    try {
        console.log('📥 Chain Database Import Script');
        console.log('================================');

        // Parse command line arguments
        const args = process.argv.slice(2);
        const config = parseArguments(args);

        // Display configuration
        console.log('📋 Import Configuration:');
        console.log(`   Input Directory: ${config.inputDir}`);
        console.log(`   Batch Size: ${config.batchSize}`);
        console.log(`   Skip Existing: ${config.skipExisting}`);
        console.log(`   Status Filter: ${config.statusFilter.join(', ')}`);
        if (config.createdByFilter) {
            console.log(`   Created By Filter: ${config.createdByFilter}`);
        }
        console.log('');

        // Check if input directory exists
        try {
            statSync(config.inputDir);
        } catch (error) {
            console.error(`❌ Input directory does not exist: ${config.inputDir}`);
            process.exit(1);
        }

        // Connect to database
        console.log('🗄️  Connecting to MongoDB...');
        const dbConnection = await connectDatabase();
        console.log('✅ Database connected successfully');

        // Initialize repositories
        const chainRepository = new ResultChainRepository();
        const statsRepository = new ResultChainStatisticsRepository();

        // Scan for JSON files
        console.log(`🔍 Scanning for JSON files in: ${config.inputDir}`);
        const jsonFiles = findJsonFiles(config.inputDir, config);
        console.log(`📁 Found ${jsonFiles.length} JSON files to process`);
        console.log('');

        if (jsonFiles.length === 0) {
            console.log('💡 No JSON files found. Generate chains first using: npm run generate-chains');
            process.exit(0);
        }

        // Import files in batches
        const stats: ImportStats = {
            total: jsonFiles.length,
            successful: 0,
            failed: 0,
            skipped: 0,
            errors: []
        };

        for (let i = 0; i < jsonFiles.length; i += config.batchSize) {
            const batch = jsonFiles.slice(i, i + config.batchSize);
            console.log(`📦 Processing batch ${Math.floor(i / config.batchSize) + 1}/${Math.ceil(jsonFiles.length / config.batchSize)}`);
            
            for (const filePath of batch) {
                await importSingleFile(filePath, chainRepository, statsRepository, config, stats);
            }
            
            console.log(`   Batch complete - Success: ${stats.successful}, Failed: ${stats.failed}, Skipped: ${stats.skipped}`);
            console.log('');

            // Small delay between batches
            if (i + config.batchSize < jsonFiles.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        // Final summary
        console.log('📈 Import Summary:');
        console.log(`   Total Files: ${stats.total}`);
        console.log(`   Successful: ${stats.successful}`);
        console.log(`   Failed: ${stats.failed}`);
        console.log(`   Skipped: ${stats.skipped}`);
        console.log(`   Success Rate: ${((stats.successful / stats.total) * 100).toFixed(1)}%`);

        if (stats.errors.length > 0) {
            console.log('');
            console.log('❌ Errors encountered:');
            stats.errors.slice(0, 5).forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
            if (stats.errors.length > 5) {
                console.log(`   ... and ${stats.errors.length - 5} more errors`);
            }
        }

        // Close database connection
        if (dbConnection && dbConnection.close) {
            await dbConnection.close();
        }
        console.log('✅ Import completed successfully!');

        process.exit(stats.failed > 0 ? 1 : 0);

    } catch (error) {
        console.error('❌ Import failed:', error);
        process.exit(1);
    }
}

function parseArguments(args: string[]): ImportConfig {
    const config: ImportConfig = {
        inputDir: './chain-output',
        batchSize: 10,
        skipExisting: true,
        statusFilter: ['active', 'testing'],
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        switch (arg) {
            case '--input-dir':
                config.inputDir = args[++i] || config.inputDir;
                break;
            case '--batch-size':
                config.batchSize = parseInt(args[++i]) || config.batchSize;
                break;
            case '--no-skip-existing':
                config.skipExisting = false;
                break;
            case '--status-filter':
                config.statusFilter = (args[++i] || 'active,testing').split(',') as ('active' | 'testing' | 'archived')[];
                break;
            case '--created-by-filter':
                config.createdByFilter = args[++i];
                break;
            case '--help':
                showHelp();
                process.exit(0);
            default:
                if (arg.startsWith('--')) {
                    console.warn(`⚠️  Unknown argument: ${arg}`);
                }
        }
    }

    return config;
}

function showHelp(): void {
    console.log(`
Chain Database Import Script

Usage: npm run import-chains [options]

Options:
  --input-dir <string>          Input directory containing JSON files (default: ./chain-output)
  --batch-size <number>         Number of files to process per batch (default: 10)
  --no-skip-existing           Don't skip chains that already exist in database
  --status-filter <comma-list> Only import chains with these statuses (default: active,testing)
  --created-by-filter <string> Only import chains created by specific creator
  --help                       Show this help message

Examples:
  npm run import-chains
  npm run import-chains -- --input-dir ./custom-output --batch-size 5
  npm run import-chains -- --no-skip-existing --status-filter active
  npm run import-chains -- --created-by-filter "my-test"

Note: This script scans JSON files created by 'npm run generate-chains' and imports them into MongoDB.
      Enhanced with totalBoardCount and baseBetAmount fields for efficient player chain selection.
`);
}

function findJsonFiles(dir: string, config: ImportConfig): string[] {
    const files: string[] = [];
    
    try {
        const entries = readdirSync(dir);
        
        for (const entry of entries) {
            const fullPath = join(dir, entry);
            const stat = statSync(fullPath);
            
            if (stat.isFile() && extname(entry).toLowerCase() === '.json' && !entry.includes('summary')) {
                // Quick check if this file matches our filters
                if (shouldIncludeFile(fullPath, config)) {
                    files.push(fullPath);
                }
            }
        }
    } catch (error) {
        console.error(`❌ Error reading directory ${dir}:`, error.message);
    }
    
    return files.sort(); // Sort for consistent processing order
}

function shouldIncludeFile(filePath: string, config: ImportConfig): boolean {
    try {
        // Quick metadata check without full JSON parsing
        const content = readFileSync(filePath, 'utf8');
        const quickCheck = content.substring(0, 1000); // First 1KB for quick check
        
        // Check created by filter
        if (config.createdByFilter) {
            if (!quickCheck.includes(`"createdBy": "${config.createdByFilter}"`)) {
                return false;
            }
        }
        
        return true;
    } catch (error) {
        return false; // Skip files we can't read
    }
}

async function importSingleFile(
    filePath: string, 
    chainRepository: ResultChainRepository,
    statsRepository: ResultChainStatisticsRepository, 
    config: ImportConfig, 
    stats: ImportStats
): Promise<void> {
    const fileName = filePath.split(/[\\/]/).pop() || filePath;
    
    try {
        // Read and parse JSON file
        const content = readFileSync(filePath, 'utf8');
        const chainData = JSON.parse(content);
        
        // Validate required fields
        if (!chainData.metadata || !chainData.boards || !chainData.config) {
            throw new Error('Invalid chain data structure - missing required fields');
        }
        
        const metadata = chainData.metadata;
        
        // Apply filters
        if (config.statusFilter.length > 0) {
            const status = metadata.status || 'testing';
            if (!config.statusFilter.includes(status)) {
                stats.skipped++;
                console.log(`   ⏭️  Skipped ${fileName} - status '${status}' not in filter`);
                return;
            }
        }
        
        if (config.createdByFilter && metadata.createdBy !== config.createdByFilter) {
            stats.skipped++;
            console.log(`   ⏭️  Skipped ${fileName} - created by '${metadata.createdBy}' not matching filter`);
            return;
        }
        
        // Check if chain already exists (by name)
        if (config.skipExisting) {
            const searchResults = await chainRepository.search(metadata.name);
            const existing = searchResults.find(chain => chain.name === metadata.name);
            if (existing) {
                stats.skipped++;
                console.log(`   ⏭️  Skipped ${fileName} - chain already exists`);
                return;
            }
        }
        
        // Calculate derived fields for easy player chain selection
        const totalBoardCount = chainData.boards?.length || 0; // Total number of boards in the chain
        const betLevel = metadata.betData?.betLevel || chainData.config?.betLevel || 0.5;
        const coinValue = metadata.betData?.coinValue || chainData.config?.coinValue || 0.1;
        const baseBetAmount = betLevel * coinValue; // Pre-calculated base bet amount (betLevel * coinValue)

        // Validate calculated fields
        if (totalBoardCount === 0) {
            throw new Error('Chain has no boards data');
        }
        if (baseBetAmount <= 0) {
            throw new Error(`Invalid base bet amount: ${baseBetAmount}`);
        }
        
        // Validate bet parameters against database constraints
        if (betLevel < 0.1 || betLevel > 10.0) {
            throw new Error(`Invalid betLevel: ${betLevel} (must be between 0.1 and 10.0)`);
        }
        if (coinValue < 0.01 || coinValue > 10.0) {
            throw new Error(`Invalid coinValue: ${coinValue} (must be between 0.01 and 10.0)`);
        }

        // Convert volatility from string name to numeric value
        const volatilityValue = convertVolatilityToNumber(chainData.config.volatility);

        // Prepare simplified chain input for main collection
        const chainInput: CreateResultChainInput = {
            name: metadata.name,
            boardsData: chainData.boards,
            betLevel: betLevel,
            coinValue: coinValue,
            totalBoardCount: totalBoardCount,
            baseBetAmount: baseBetAmount,
            volatility: volatilityValue, // Store as numeric value (1-5)
            patternType: metadata.patternType,
            inactive: false // false = active, true = inactive
        };
        
        // Insert main chain record into database
        const chainResult = await chainRepository.create(chainInput);
        
        // Prepare result chain structure for statistics
        const resultChainInterface = {
            boards: chainData.boards,
            config: chainData.config,
            rtpResult: {
                actualRTP: metadata.actualRTP,
                variance: metadata.rtpVariance || Math.abs(metadata.actualRTP - metadata.targetRTP),
                meetsTarget: metadata.meetsTargetRTP !== undefined ? metadata.meetsTargetRTP : 
                           Math.abs(metadata.actualRTP - metadata.targetRTP) <= (chainData.config.tolerance || 0.02)
            },
            tumbleStats: chainData.tumbleStats || {},
            generationAttempts: metadata.attempts || 1,
            generationDuration: metadata.duration || 0,
            generationStats: metadata.generationStats || {
                attempts: metadata.attempts || 1,
                duration: metadata.duration || 0,
                finalRTP: metadata.actualRTP,
                targetAchieved: metadata.meetsTargetRTP || false
            },
            volatility: volatilityValue // Pass numeric volatility to statistics
        };

        // Use the pre-calculated totalWagered from betData - this is already calculated in generate-chains
        const totalWagered = metadata.betData?.totalBetAmount;
        
        if (!totalWagered || isNaN(totalWagered)) {
            throw new Error(`Invalid totalWagered value: ${totalWagered} for chain ${metadata.name}`);
        }

        // Prepare statistics input for statistics collection
        const statsInput: CreateResultChainStatisticsInput = {
            resultChainName: metadata.name,
            patternType: metadata.patternType,
            resultChain: resultChainInterface as any,
            totalWagered: totalWagered,
            createdBy: metadata.createdBy || 'import-script',
            status: 'active'
        };
        
        // Insert statistics record into database
        const statsResult = await statsRepository.create(statsInput);
        
        stats.successful++;
        console.log(`   ✅ Imported ${fileName} - Chain ID: ${chainResult._id.toString().substring(0, 8)}... Stats ID: ${statsResult._id.toString().substring(0, 8)}... RTP: ${(metadata.actualRTP * 100).toFixed(2)}% Boards: ${totalBoardCount} BaseBet: ${baseBetAmount.toFixed(4)}`);
        
    } catch (error) {
        stats.failed++;
        const errorMessage = `${fileName}: ${error.message}`;
        stats.errors.push(errorMessage);
        console.log(`   ❌ Failed ${fileName} - ${error.message}`);
    }
}

// Run the script
// Fix for ES module entry point with ts-node
const isMainModule = process.argv[1] && process.argv[1].includes('import-chains');
if (isMainModule) {
    main().catch(console.error);
}
