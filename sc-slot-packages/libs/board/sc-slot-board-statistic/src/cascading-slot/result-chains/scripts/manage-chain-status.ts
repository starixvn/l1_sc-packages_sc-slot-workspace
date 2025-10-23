#!/usr/bin/env ts-node

/**
 * Chain Status Management Script
 * 
 * Usage:
 *   npm run manage-chain-status <action> <chainId|filter>
 * 
 * Actions:
 *   activate <chainId>              - Activate a specific chain by ID
 *   deactivate <chainId>            - Deactivate a specific chain by ID
 *   bulk-activate <filter>          - Activate all chains matching filter
 *   bulk-deactivate <filter>        - Deactivate all chains matching filter
 *   list-active                     - List all active chains
 *   list-inactive                   - List all inactive chains
 * 
 * Examples:
 *   npm run manage-chain-status activate 507f1f77bcf86cd799439011
 *   npm run manage-chain-status deactivate 507f1f77bcf86cd799439011
 *   npm run manage-chain-status bulk-deactivate pattern=tease
 *   npm run manage-chain-status bulk-activate volatility=VeryHigh
 *   npm run manage-chain-status list-active
 */

import { connectDatabase } from '../database/connection';
import { ResultChainRepository } from '../database/repositories/result-chain-repository';

interface ScriptOptions {
    action: 'activate' | 'deactivate' | 'bulk-activate' | 'bulk-deactivate' | 'list-active' | 'list-inactive';
    chainId?: string;
    filter?: {
        volatility?: string;
        patternType?: string;
    };
}

function parseArguments(): ScriptOptions {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        showHelp();
        process.exit(1);
    }

    const action = args[0] as ScriptOptions['action'];
    const options: ScriptOptions = { action };

    if (action === 'activate' || action === 'deactivate') {
        if (args.length < 2) {
            console.error(`❌ Error: ${action} requires a chain ID`);
            showHelp();
            process.exit(1);
        }
        options.chainId = args[1];
    } else if (action === 'bulk-activate' || action === 'bulk-deactivate') {
        if (args.length < 2) {
            console.error(`❌ Error: ${action} requires filter arguments`);
            showHelp();
            process.exit(1);
        }
        
        // Parse filter arguments (e.g., "volatility=VeryHigh pattern=tease")
        options.filter = {};
        for (let i = 1; i < args.length; i++) {
            const [key, value] = args[i].split('=');
            if (key === 'volatility') {
                options.filter.volatility = value;
            } else if (key === 'pattern') {
                options.filter.patternType = value;
            }
        }
    }

    return options;
}

function showHelp() {
    console.log(`
Chain Status Management Script

Usage:
  npm run manage-chain-status <action> [arguments]

Actions:
  activate <chainId>              - Activate a specific chain by ID
  deactivate <chainId>            - Deactivate a specific chain by ID
  bulk-activate [filters]         - Activate all chains matching filters
  bulk-deactivate [filters]       - Deactivate all chains matching filters
  list-active                     - List all active chains
  list-inactive                   - List all inactive chains

Filters (for bulk operations):
  volatility=<value>              - Filter by volatility (Low, MediumLow, Medium, High, VeryHigh)
  pattern=<value>                 - Filter by pattern (comeback, cliffhanger, discovery, tease, wave)

Examples:
  # Activate/deactivate specific chain
  npm run manage-chain-status activate 507f1f77bcf86cd799439011
  npm run manage-chain-status deactivate 507f1f77bcf86cd799439011

  # Bulk operations
  npm run manage-chain-status bulk-deactivate pattern=tease
  npm run manage-chain-status bulk-activate volatility=VeryHigh
  npm run manage-chain-status bulk-deactivate volatility=Low pattern=tease

  # List chains
  npm run manage-chain-status list-active
  npm run manage-chain-status list-inactive
    `);
}

async function main() {
    const options = parseArguments();
    const repository = new ResultChainRepository();

    console.log('\n🔌 Connecting to MongoDB...');
    await connectDatabase();

    try {
        switch (options.action) {
            case 'activate':
                if (!options.chainId) {
                    console.error('❌ Chain ID is required');
                    process.exit(1);
                }
                const activated = await repository.activate(options.chainId);
                if (activated) {
                    console.log(`\n✅ Chain activated successfully`);
                    console.log(`   ID: ${activated._id}`);
                    console.log(`   Name: ${activated.name}`);
                    console.log(`   Status: ${activated.inactive ? 'ACTIVE' : 'INACTIVE'}`);
                } else {
                    console.error('\n❌ Chain not found');
                }
                break;

            case 'deactivate':
                if (!options.chainId) {
                    console.error('❌ Chain ID is required');
                    process.exit(1);
                }
                const deactivated = await repository.deactivate(options.chainId);
                if (deactivated) {
                    console.log(`\n✅ Chain deactivated successfully`);
                    console.log(`   ID: ${deactivated._id}`);
                    console.log(`   Name: ${deactivated.name}`);
                    console.log(`   Status: ${deactivated.inactive ? 'ACTIVE' : 'INACTIVE'}`);
                } else {
                    console.error('\n❌ Chain not found');
                }
                break;

            case 'bulk-activate':
                if (!options.filter || Object.keys(options.filter).length === 0) {
                    console.error('❌ At least one filter is required for bulk operations');
                    process.exit(1);
                }
                console.log('\n📝 Activating chains with filters:', options.filter);
                const activatedCount = await repository.bulkUpdateActiveStatus(options.filter, true);
                console.log(`\n✅ Activated ${activatedCount} chains`);
                break;

            case 'bulk-deactivate':
                if (!options.filter || Object.keys(options.filter).length === 0) {
                    console.error('❌ At least one filter is required for bulk operations');
                    process.exit(1);
                }
                console.log('\n📝 Deactivating chains with filters:', options.filter);
                const deactivatedCount = await repository.bulkUpdateActiveStatus(options.filter, false);
                console.log(`\n✅ Deactivated ${deactivatedCount} chains`);
                break;

            case 'list-active':
                console.log('\n📋 Listing active chains...');
                const activeChains = await repository.getFiltered({ active: true }, 100);
                console.log(`\nFound ${activeChains.total} active chains:\n`);
                activeChains.chains.forEach(chain => {
                    console.log(`   ${chain._id} | ${chain.name}`);
                    console.log(`      Volatility: ${chain.volatility || 'N/A'} | Pattern: ${chain.patternType || 'N/A'}`);
                    console.log(`      Boards: ${chain.totalBoardCount} | Bet: ${chain.baseBetAmount}\n`);
                });
                break;

            case 'list-inactive':
                console.log('\n📋 Listing inactive chains...');
                const inactiveChains = await repository.getFiltered({ active: false }, 100);
                console.log(`\nFound ${inactiveChains.total} inactive chains:\n`);
                inactiveChains.chains.forEach(chain => {
                    console.log(`   ${chain._id} | ${chain.name}`);
                    console.log(`      Volatility: ${chain.volatility || 'N/A'} | Pattern: ${chain.patternType || 'N/A'}`);
                    console.log(`      Boards: ${chain.totalBoardCount} | Bet: ${chain.baseBetAmount}\n`);
                });
                break;

            default:
                console.error(`❌ Unknown action: ${options.action}`);
                showHelp();
                process.exit(1);
        }

        console.log('\n✅ Operation completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error);
        process.exit(1);
    }
}

main();

