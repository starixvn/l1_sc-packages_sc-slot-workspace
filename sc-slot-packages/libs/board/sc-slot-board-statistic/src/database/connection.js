import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
// Load environment variables
dotenv.config();
export class DatabaseConnection {
    static instance;
    isConnected = false;
    constructor() { }
    /**
     * Get singleton instance of database connection
     */
    static getInstance() {
        if (!DatabaseConnection.instance) {
            DatabaseConnection.instance = new DatabaseConnection();
        }
        return DatabaseConnection.instance;
    }
    /**
     * Initialize database connection and test connectivity
     */
    async connect(config) {
        try {
            const dbUri = config?.uri || process.env.MONGODB_URI || 'mongodb://lmn_backend:LmnBackend@10.10.50.12:39202,10.10.50.13:39202,10.10.50.14:39202/?replicaSet=L2ppLocal&appName=resultChain';
            const defaultOptions = {
                dbName: 'minigame',
                maxPoolSize: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
                serverSelectionTimeoutMS: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
                socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT || '45000'),
                bufferCommands: false,
            };
            const options = { ...defaultOptions, ...(config?.options || {}) };
            console.log('🗄️  Connecting to MongoDB...');
            await mongoose.connect(dbUri, options);
            // Set up connection event listeners
            mongoose.connection.on('connected', () => {
                console.log('✅ MongoDB connected successfully');
                this.isConnected = true;
            });
            mongoose.connection.on('error', (error) => {
                console.error('❌ MongoDB connection error:', error);
                this.isConnected = false;
            });
            mongoose.connection.on('disconnected', () => {
                console.log('🔌 MongoDB disconnected');
                this.isConnected = false;
            });
            // Test connection (without admin privileges)
            console.log('🗄️  Database:', mongoose.connection.name);
            console.log('🗄️  Connection successful to replica set');
            this.isConnected = true;
        }
        catch (error) {
            console.error('❌ Database connection failed:', error);
            this.isConnected = false;
            throw error;
        }
    }
    /**
     * Close database connection
     */
    async close() {
        try {
            await mongoose.connection.close();
            console.log('🗄️  Database connection closed');
            this.isConnected = false;
        }
        catch (error) {
            console.error('❌ Error closing database connection:', error);
            throw error;
        }
    }
    /**
     * Health check for the database
     */
    async healthCheck() {
        try {
            const state = mongoose.connection.readyState;
            const stateLabels = {
                0: 'disconnected',
                1: 'connected',
                2: 'connecting',
                3: 'disconnecting'
            };
            if (state === 1) {
                return {
                    status: 'healthy',
                    timestamp: new Date(),
                    info: {
                        connectionState: stateLabels[state],
                        database: mongoose.connection.name,
                        host: mongoose.connection.host,
                        port: mongoose.connection.port
                    }
                };
            }
            else {
                return {
                    status: 'unhealthy',
                    timestamp: new Date(),
                    info: {
                        connectionState: stateLabels[state],
                        error: 'Database not connected'
                    }
                };
            }
        }
        catch (error) {
            return {
                status: 'unhealthy',
                timestamp: new Date(),
                info: {
                    error: error.message,
                    connectionState: 'error'
                }
            };
        }
    }
    /**
     * Get connection status
     */
    isConnectionReady() {
        return this.isConnected && mongoose.connection.readyState === 1;
    }
    /**
     * Get connection statistics
     */
    getConnectionStats() {
        return {
            isConnected: this.isConnected,
            readyState: mongoose.connection.readyState,
            name: mongoose.connection.name,
            host: mongoose.connection.host,
            port: mongoose.connection.port,
            models: Object.keys(mongoose.connection.models)
        };
    }
    /**
     * Initialize indexes (for optimization)
     */
    async createIndexes() {
        try {
            console.log('🗄️  Creating database indexes...');
            // Get all models and ensure indexes
            const models = Object.values(mongoose.connection.models);
            for (const model of models) {
                await model.createIndexes();
                console.log(`✅ Indexes created for ${model.modelName}`);
            }
            console.log('✅ All database indexes created successfully');
        }
        catch (error) {
            console.error('❌ Failed to create indexes:', error);
            throw error;
        }
    }
    /**
     * Drop database (for testing/development)
     */
    async dropDatabase() {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Cannot drop database in production environment');
        }
        try {
            console.log('🗄️  Dropping database...');
            await mongoose.connection.db.dropDatabase();
            console.log('✅ Database dropped successfully');
        }
        catch (error) {
            console.error('❌ Failed to drop database:', error);
            throw error;
        }
    }
}
// Export singleton instance getter
export const getDatabase = () => {
    return DatabaseConnection.getInstance();
};
// Export connection helper
export const connectDatabase = async (config) => {
    const db = DatabaseConnection.getInstance();
    await db.connect(config);
    return db;
};
