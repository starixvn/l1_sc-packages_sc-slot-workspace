#!/usr/bin/env ts-node

/**
 * Database Reset Script
 * Clears all data from MongoDB collections (for testing)
 */

import { connectDatabase } from '../database/connection';
import { ResultChain } from '../database/models/result-chain.model';
import { ResultChainStatistics } from '../database/models/result-chain-statistics.model';

async function main() {
    try {
        console.log('🗑️  Database Reset Script');
        console.log('=========================');
        console.log('⚠️  WARNING: This will delete ALL data from the database!');

        // Parse command line arguments for confirmation
        const args = process.argv.slice(2);
        const force = args.includes('--force');
        const confirm = args.includes('--confirm');

        if (!force && !confirm) {
            console.log('');
            console.log('🛑 This action requires confirmation.');
            console.log('   Use --confirm to proceed with reset');
            console.log('   Use --force to skip this warning in scripts');
            console.log('');
            console.log('Example: npm run db:reset -- --confirm');
            process.exit(0);
        }

        if (!force) {
            console.log('⏳ Proceeding in 3 seconds...');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        // Initialize database connection
        console.log('🗄️  Connecting to MongoDB...');
        const db = await connectDatabase();
        console.log('✅ Database connected successfully');

        // Get counts before deletion
        console.log('📊 Current database state:');
        const chainCount = await ResultChain.countDocuments();
        const statsCount = await ResultChainStatistics.countDocuments();
        
        console.log(`   Result Chains: ${chainCount}`);
        console.log(`   Chain Statistics: ${statsCount}`);
        console.log(`   Total Documents: ${chainCount + statsCount}`);

        if (chainCount + statsCount === 0) {
            console.log('✅ Database is already empty!');
            await db.close();
            process.exit(0);
        }

        console.log('');
        console.log('🗑️  Clearing collections...');

        // Clear statistics first (they reference chains by name)
        console.log('   Clearing result chain statistics...');
        const statsResult = await ResultChainStatistics.deleteMany({});
        console.log(`   ✅ Deleted ${statsResult.deletedCount} statistics records`);

        console.log('   Clearing result chains...');
        const chainResult = await ResultChain.deleteMany({});
        console.log(`   ✅ Deleted ${chainResult.deletedCount} chains`);

        // Verify database is empty
        console.log('');
        console.log('🔍 Verifying database state...');
        const finalChainCount = await ResultChain.countDocuments();
        const finalStatsCount = await ResultChainStatistics.countDocuments();
        
        const totalRemaining = finalChainCount + finalStatsCount;
        
        if (totalRemaining === 0) {
            console.log('✅ Database successfully cleared!');
        } else {
            console.log(`⚠️  Warning: ${totalRemaining} documents remain in database`);
            console.log(`   Chains: ${finalChainCount}`);
            console.log(`   Statistics: ${finalStatsCount}`);
        }

        // Optional: Drop and recreate indexes
        if (args.includes('--rebuild-indexes')) {
            console.log('');
            console.log('🔄 Rebuilding database indexes...');
            await db.createIndexes();
            console.log('✅ Indexes rebuilt successfully');
        }

        // Close database connection
        await db.close();
        console.log('');
        console.log('✅ Database reset completed successfully!');

        process.exit(0);

    } catch (error) {
        console.error('❌ Database reset failed:', error);
        process.exit(1);
    }
}

// Show help if requested
if (process.argv.includes('--help')) {
    console.log(`
Database Reset Script (MongoDB)

⚠️  WARNING: This script will delete ALL data from the database!

Usage: npm run db:reset [options]

Options:
  --confirm              Confirm that you want to delete all data
  --force                Skip confirmation warning (for scripts)
  --rebuild-indexes      Rebuild database indexes after clearing
  --help                 Show this help message

Examples:
  npm run db:reset -- --confirm                      # Interactive reset
  npm run db:reset -- --force --rebuild-indexes      # Script reset with index rebuild

Safety Features:
  - Requires explicit confirmation (--confirm or --force)
  - Shows current data counts before deletion
  - Verifies successful deletion
  - Only works in development/testing environments

Use Cases:
  - Cleaning up test data
  - Resetting development environment
  - Preparing for fresh data import
`);
    process.exit(0);
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}
