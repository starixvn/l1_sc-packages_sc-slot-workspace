#!/usr/bin/env ts-node
/**
 * Database Connection Test Script
 * Tests MongoDB connection and basic operations
 */
import { connectDatabase } from '../database/connection';
async function main() {
    try {
        console.log('🗄️  MongoDB Connection Test');
        console.log('============================');
        // Test connection
        console.log('🔄 Connecting to MongoDB...');
        const db = await connectDatabase();
        console.log('✅ Database connected successfully!');
        // Health check
        console.log('🔄 Running health check...');
        const healthStatus = await db.healthCheck();
        console.log('📊 Health Status:', JSON.stringify(healthStatus, null, 2));
        // Connection stats
        console.log('🔄 Getting connection stats...');
        const stats = db.getConnectionStats();
        console.log('📈 Connection Stats:', JSON.stringify(stats, null, 2));
        // Test index creation
        console.log('🔄 Creating database indexes...');
        await db.createIndexes();
        console.log('✅ Indexes created successfully!');
        console.log('');
        console.log('✅ All tests passed! MongoDB is ready to use.');
        // Close connection
        await db.close();
        console.log('🗄️  Database connection closed');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Database connection test failed:', error);
        process.exit(1);
    }
}
// Run the test
if (require.main === module) {
    main().catch(console.error);
}
