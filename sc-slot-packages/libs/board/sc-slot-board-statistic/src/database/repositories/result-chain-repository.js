import mongoose from 'mongoose';
import { ResultChain } from '../models/result-chain.model';
export class ResultChainRepository {
    /**
     * Create a new result chain in the database
     */
    async create(input) {
        const { name, boardsData, betLevel, coinValue } = input;
        try {
            const chainDoc = new ResultChain({
                name,
                boardsData,
                betLevel,
                coinValue
            });
            const savedChain = await chainDoc.save();
            console.log(`✅ Result chain created: ${savedChain.name} (ID: ${savedChain._id})`);
            return savedChain;
        }
        catch (error) {
            console.error('❌ Failed to create result chain:', error);
            throw error;
        }
    }
    /**
     * Get result chain by ID
     */
    async getById(id) {
        try {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return null;
            }
            return await ResultChain.findById(id);
        }
        catch (error) {
            console.error('❌ Failed to get result chain by ID:', error);
            throw error;
        }
    }
    /**
     * Get result chain by name
     */
    async getByName(name) {
        try {
            return await ResultChain.findOne({ name });
        }
        catch (error) {
            console.error('❌ Failed to get result chain by name:', error);
            throw error;
        }
    }
    /**
     * Get filtered list of result chains
     */
    async getFiltered(filter = {}, limit = 50, offset = 0) {
        try {
            const query = {};
            // Build query conditions
            if (filter.name) {
                query.name = { $regex: filter.name, $options: 'i' };
            }
            if (filter.createdAfter || filter.createdBefore) {
                query.createdAt = {};
                if (filter.createdAfter)
                    query.createdAt.$gte = filter.createdAfter;
                if (filter.createdBefore)
                    query.createdAt.$lte = filter.createdBefore;
            }
            // Get total count
            const total = await ResultChain.countDocuments(query);
            // Get paginated results
            const chains = await ResultChain
                .find(query)
                .sort({ createdAt: -1 })
                .skip(offset)
                .limit(limit);
            return { chains, total };
        }
        catch (error) {
            console.error('❌ Failed to get filtered result chains:', error);
            throw error;
        }
    }
    /**
     * Search chains by name
     */
    async search(searchTerm, limit = 20) {
        try {
            const searchRegex = new RegExp(searchTerm, 'i');
            return await ResultChain
                .find({ name: searchRegex })
                .sort({ createdAt: -1 })
                .limit(limit);
        }
        catch (error) {
            console.error('❌ Failed to search result chains:', error);
            throw error;
        }
    }
    /**
     * Batch create multiple chains (useful for testing)
     */
    async batchCreate(inputs) {
        try {
            const results = [];
            // Use session for transaction-like behavior
            const session = await mongoose.startSession();
            try {
                await session.withTransaction(async () => {
                    for (const input of inputs) {
                        const chainDoc = new ResultChain({
                            name: input.name,
                            boardsData: input.boardsData
                        });
                        const savedChain = await chainDoc.save({ session });
                        results.push(savedChain);
                    }
                });
                console.log(`✅ Batch created ${results.length} result chains`);
                return results;
            }
            finally {
                await session.endSession();
            }
        }
        catch (error) {
            console.error('❌ Failed to batch create result chains:', error);
            throw error;
        }
    }
    /**
     * Get all chains (for scripts/testing)
     */
    async getAll() {
        try {
            return await ResultChain.find({}).sort({ createdAt: -1 });
        }
        catch (error) {
            console.error('❌ Failed to get all result chains:', error);
            throw error;
        }
    }
    /**
     * Get recent chains
     */
    async getRecent(limit = 10) {
        try {
            return await ResultChain.findRecent(limit);
        }
        catch (error) {
            console.error('❌ Failed to get recent result chains:', error);
            throw error;
        }
    }
    /**
     * Delete chain permanently (for testing)
     */
    async delete(id) {
        try {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return false;
            }
            const result = await ResultChain.findByIdAndDelete(id);
            if (result) {
                console.log(`✅ Result chain deleted: ${result.name}`);
            }
            return result !== null;
        }
        catch (error) {
            console.error('❌ Failed to delete result chain:', error);
            throw error;
        }
    }
    /**
     * Get total count of chains
     */
    async count() {
        try {
            return await ResultChain.countDocuments({});
        }
        catch (error) {
            console.error('❌ Failed to count result chains:', error);
            throw error;
        }
    }
    /**
     * Find chains by bet parameters for player selection
     */
    async findByBetParams(betLevel, coinValue, limit = 10) {
        try {
            return await ResultChain.find({
                betLevel,
                coinValue
            })
                .sort({ createdAt: -1 })
                .limit(limit);
        }
        catch (error) {
            console.error('❌ Failed to find result chains by bet params:', error);
            throw error;
        }
    }
    /**
     * Find chains within bet parameter ranges
     */
    async findByBetRange(minBetLevel, maxBetLevel, minCoinValue, maxCoinValue, limit = 10) {
        try {
            return await ResultChain.find({
                betLevel: { $gte: minBetLevel, $lte: maxBetLevel },
                coinValue: { $gte: minCoinValue, $lte: maxCoinValue }
            })
                .sort({ createdAt: -1 })
                .limit(limit);
        }
        catch (error) {
            console.error('❌ Failed to find result chains by bet range:', error);
            throw error;
        }
    }
}
