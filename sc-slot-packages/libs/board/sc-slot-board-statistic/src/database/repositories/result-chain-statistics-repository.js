import mongoose from 'mongoose';
import { ResultChainStatistics } from '../models/result-chain-statistics.model';
export class ResultChainStatisticsRepository {
    /**
     * Create a new result chain statistics record in the database
     */
    async create(input) {
        const { resultChainName, patternType, resultChain, createdBy, status = 'active' } = input;
        try {
            const statsDoc = new ResultChainStatistics({
                resultChainName,
                patternType,
                boardCount: resultChain.config.boardCount,
                targetRTP: resultChain.config.targetRTP,
                actualRTP: resultChain.rtpResult.actualRTP,
                rtpVariance: Math.abs(resultChain.rtpResult.actualRTP - resultChain.config.targetRTP),
                totalWagered: resultChain.config.betSize * resultChain.config.boardCount,
                totalWon: resultChain.boards.reduce((sum, board) => sum + board.totalCascadeWin, 0),
                generationAttempts: resultChain.generationAttempts || 1,
                generationDuration: resultChain.generationDuration || 0,
                configJson: resultChain.config,
                tumbleStats: resultChain.tumbleStats,
                generationStats: resultChain.generationStats || {},
                status,
                createdBy
            });
            const savedStats = await statsDoc.save();
            console.log(`✅ Result chain statistics created: ${savedStats.resultChainName} (ID: ${savedStats._id})`);
            return savedStats;
        }
        catch (error) {
            console.error('❌ Failed to create result chain statistics:', error);
            throw error;
        }
    }
    /**
     * Get statistics by chain name
     */
    async getByChainName(chainName) {
        try {
            return await ResultChainStatistics.findByChainName(chainName);
        }
        catch (error) {
            console.error('❌ Failed to get statistics by chain name:', error);
            throw error;
        }
    }
    /**
     * Get statistics by ID
     */
    async getById(id) {
        try {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return null;
            }
            return await ResultChainStatistics.findById(id);
        }
        catch (error) {
            console.error('❌ Failed to get statistics by ID:', error);
            throw error;
        }
    }
    /**
     * Get filtered list of result chain statistics
     */
    async getFiltered(filter = {}, limit = 50, offset = 0) {
        try {
            const query = {};
            // Build query conditions
            if (filter.patternType) {
                query.patternType = filter.patternType;
            }
            if (filter.status) {
                query.status = filter.status;
            }
            if (filter.boardCountMin || filter.boardCountMax) {
                query.boardCount = {};
                if (filter.boardCountMin)
                    query.boardCount.$gte = filter.boardCountMin;
                if (filter.boardCountMax)
                    query.boardCount.$lte = filter.boardCountMax;
            }
            if (filter.rtpMin || filter.rtpMax) {
                query.actualRTP = {};
                if (filter.rtpMin)
                    query.actualRTP.$gte = filter.rtpMin;
                if (filter.rtpMax)
                    query.actualRTP.$lte = filter.rtpMax;
            }
            if (filter.createdAfter || filter.createdBefore) {
                query.createdAt = {};
                if (filter.createdAfter)
                    query.createdAt.$gte = filter.createdAfter;
                if (filter.createdBefore)
                    query.createdAt.$lte = filter.createdBefore;
            }
            // Get total count
            const total = await ResultChainStatistics.countDocuments(query);
            // Get paginated results
            const stats = await ResultChainStatistics
                .find(query)
                .sort({ createdAt: -1 })
                .skip(offset)
                .limit(limit);
            return { stats, total };
        }
        catch (error) {
            console.error('❌ Failed to get filtered result chain statistics:', error);
            throw error;
        }
    }
    /**
     * Get active chains suitable for player assignment
     */
    async getActiveForAssignment(patternTypes, boardCountRange) {
        try {
            return await ResultChainStatistics.findSuitableForAssignment(patternTypes, boardCountRange);
        }
        catch (error) {
            console.error('❌ Failed to get active chains for assignment:', error);
            throw error;
        }
    }
    /**
     * Update statistics status
     */
    async updateStatus(id, status) {
        try {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return null;
            }
            const updatedStats = await ResultChainStatistics.findByIdAndUpdate(id, { status }, { new: true });
            if (updatedStats) {
                console.log(`✅ Chain statistics status updated: ${updatedStats.resultChainName} → ${status}`);
            }
            return updatedStats;
        }
        catch (error) {
            console.error('❌ Failed to update result chain statistics status:', error);
            throw error;
        }
    }
    /**
     * Get chains by pattern type
     */
    async getByPatternType(patternType) {
        try {
            return await ResultChainStatistics.findByPattern(patternType);
        }
        catch (error) {
            console.error('❌ Failed to get statistics by pattern:', error);
            throw error;
        }
    }
    /**
     * Get chain statistics for dashboard
     */
    async getChainStatistics() {
        try {
            const stats = await ResultChainStatistics.getStatistics();
            return stats[0] || {
                totalChains: 0,
                activeChains: 0,
                testingChains: 0,
                archivedChains: 0,
                averageRTP: 0,
                averageBoardCount: 0,
                firstChainCreated: null,
                lastChainCreated: null
            };
        }
        catch (error) {
            console.error('❌ Failed to get chain statistics:', error);
            throw error;
        }
    }
    /**
     * Get pattern distribution statistics
     */
    async getPatternDistribution() {
        try {
            return await ResultChainStatistics.getPatternDistribution();
        }
        catch (error) {
            console.error('❌ Failed to get pattern distribution:', error);
            throw error;
        }
    }
    /**
     * Get all statistics (for scripts/testing)
     */
    async getAll(status) {
        try {
            const query = status ? { status } : {};
            return await ResultChainStatistics.find(query).sort({ createdAt: -1 });
        }
        catch (error) {
            console.error('❌ Failed to get all result chain statistics:', error);
            throw error;
        }
    }
    /**
     * Delete statistics permanently (for testing)
     */
    async delete(id) {
        try {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return false;
            }
            const result = await ResultChainStatistics.findByIdAndDelete(id);
            if (result) {
                console.log(`✅ Result chain statistics deleted: ${result.resultChainName}`);
            }
            return result !== null;
        }
        catch (error) {
            console.error('❌ Failed to delete result chain statistics:', error);
            throw error;
        }
    }
    /**
     * Count statistics by status
     */
    async countByStatus() {
        try {
            const pipeline = [
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ];
            const results = await ResultChainStatistics.aggregate(pipeline);
            const counts = {
                active: 0,
                archived: 0,
                testing: 0
            };
            results.forEach(result => {
                counts[result._id] = result.count;
            });
            return counts;
        }
        catch (error) {
            console.error('❌ Failed to count statistics by status:', error);
            throw error;
        }
    }
}
