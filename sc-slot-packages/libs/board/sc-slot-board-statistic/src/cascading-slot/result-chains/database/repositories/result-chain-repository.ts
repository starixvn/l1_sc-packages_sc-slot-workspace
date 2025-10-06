import mongoose from 'mongoose';
import { ResultChain, IResultChain } from '../models/result-chain.model';

export interface CreateResultChainInput {
    name: string;
    boardsData: any[];
    betLevel: number;
    coinValue: number;
    totalBoardCount: number;
    baseBetAmount: number;
}

export interface ResultChainFilter {
    name?: string;
    createdAfter?: Date;
    createdBefore?: Date;
}

export class ResultChainRepository {
    /**
     * Create a new result chain in the database
     */
    async create(input: CreateResultChainInput): Promise<IResultChain> {
        const { name, boardsData, betLevel, coinValue, totalBoardCount, baseBetAmount } = input;

        try {
            const chainDoc = new ResultChain({
                name,
                boardsData,
                betLevel,
                coinValue,
                totalBoardCount,
                baseBetAmount
            });

            const savedChain = await chainDoc.save();
            console.log(`✅ Result chain created: ${savedChain.name} (ID: ${savedChain._id})`);
            return savedChain;
        } catch (error) {
            console.error('❌ Failed to create result chain:', error);
            throw error;
        }
    }

    /**
     * Get result chain by ID
     */
    async getById(id: string): Promise<IResultChain | null> {
        try {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return null;
            }
            return await ResultChain.findById(id);
        } catch (error) {
            console.error('❌ Failed to get result chain by ID:', error);
            throw error;
        }
    }

    /**
     * Get result chain by name
     */
    async getByName(name: string): Promise<IResultChain | null> {
        try {
            return await ResultChain.findOne({ name });
        } catch (error) {
            console.error('❌ Failed to get result chain by name:', error);
            throw error;
        }
    }

    /**
     * Get filtered list of result chains
     */
    async getFiltered(filter: ResultChainFilter = {}, limit: number = 50, offset: number = 0): Promise<{
        chains: IResultChain[];
        total: number;
    }> {
        try {
            const query: any = {};

            // Build query conditions
            if (filter.name) {
                query.name = { $regex: filter.name, $options: 'i' };
            }

            if (filter.createdAfter || filter.createdBefore) {
                query.createdAt = {};
                if (filter.createdAfter) query.createdAt.$gte = filter.createdAfter;
                if (filter.createdBefore) query.createdAt.$lte = filter.createdBefore;
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
        } catch (error) {
            console.error('❌ Failed to get filtered result chains:', error);
            throw error;
        }
    }

    /**
     * Search chains by name
     */
    async search(searchTerm: string, limit: number = 20): Promise<IResultChain[]> {
        try {
            const searchRegex = new RegExp(searchTerm, 'i');
            
            return await ResultChain
                .find({ name: searchRegex })
                .sort({ createdAt: -1 })
                .limit(limit);
        } catch (error) {
            console.error('❌ Failed to search result chains:', error);
            throw error;
        }
    }

    /**
     * Batch create multiple chains (useful for testing)
     */
    async batchCreate(inputs: CreateResultChainInput[]): Promise<IResultChain[]> {
        try {
            const results: IResultChain[] = [];
            
            // Use session for transaction-like behavior
            const session = await mongoose.startSession();
            
            try {
                await session.withTransaction(async () => {
                    for (const input of inputs) {
                        const chainDoc = new ResultChain({
                            name: input.name,
                            boardsData: input.boardsData,
                            betLevel: input.betLevel,
                            coinValue: input.coinValue,
                            totalBoardCount: input.totalBoardCount,
                            baseBetAmount: input.baseBetAmount
                        });

                        const savedChain = await chainDoc.save({ session });
                        results.push(savedChain);
                    }
                });
                
                console.log(`✅ Batch created ${results.length} result chains`);
                return results;
            } finally {
                await session.endSession();
            }
        } catch (error) {
            console.error('❌ Failed to batch create result chains:', error);
            throw error;
        }
    }

    /**
     * Get all chains (for scripts/testing)
     */
    async getAll(): Promise<IResultChain[]> {
        try {
            return await ResultChain.find({}).sort({ createdAt: -1 });
        } catch (error) {
            console.error('❌ Failed to get all result chains:', error);
            throw error;
        }
    }

    /**
     * Get recent chains
     */
    async getRecent(limit: number = 10): Promise<IResultChain[]> {
        try {
            return await ResultChain.findRecent(limit);
        } catch (error) {
            console.error('❌ Failed to get recent result chains:', error);
            throw error;
        }
    }

    /**
     * Delete chain permanently (for testing)
     */
    async delete(id: string): Promise<boolean> {
        try {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return false;
            }

            const result = await ResultChain.findByIdAndDelete(id);
            if (result) {
                console.log(`✅ Result chain deleted: ${result.name}`);
            }
            return result !== null;
        } catch (error) {
            console.error('❌ Failed to delete result chain:', error);
            throw error;
        }
    }

    /**
     * Get total count of chains
     */
    async count(): Promise<number> {
        try {
            return await ResultChain.countDocuments({});
        } catch (error) {
            console.error('❌ Failed to count result chains:', error);
            throw error;
        }
    }

    /**
     * Find chains by bet parameters for player selection
     */
    async findByBetParams(betLevel: number, coinValue: number, limit: number = 10): Promise<IResultChain[]> {
        try {
            return await ResultChain.find({
                betLevel,
                coinValue
            })
            .sort({ createdAt: -1 })
            .limit(limit);
        } catch (error) {
            console.error('❌ Failed to find result chains by bet params:', error);
            throw error;
        }
    }

    /**
     * Find chains within bet parameter ranges
     */
    async findByBetRange(
        minBetLevel: number, 
        maxBetLevel: number, 
        minCoinValue: number, 
        maxCoinValue: number, 
        limit: number = 10
    ): Promise<IResultChain[]> {
        try {
            return await ResultChain.find({
                betLevel: { $gte: minBetLevel, $lte: maxBetLevel },
                coinValue: { $gte: minCoinValue, $lte: maxCoinValue }
            })
            .sort({ createdAt: -1 })
            .limit(limit);
        } catch (error) {
            console.error('❌ Failed to find result chains by bet range:', error);
            throw error;
        }
    }

    /**
     * Find chains by base bet amount for easy player selection
     */
    async findByBaseBetAmount(baseBetAmount: number, limit: number = 10): Promise<IResultChain[]> {
        try {
            return await ResultChain.find({
                baseBetAmount
            })
            .sort({ createdAt: -1 })
            .limit(limit);
        } catch (error) {
            console.error('❌ Failed to find result chains by base bet amount:', error);
            throw error;
        }
    }

    /**
     * Find chains by total board count for session planning
     */
    async findByBoardCount(totalBoardCount: number, limit: number = 10): Promise<IResultChain[]> {
        try {
            return await ResultChain.find({
                totalBoardCount
            })
            .sort({ createdAt: -1 })
            .limit(limit);
        } catch (error) {
            console.error('❌ Failed to find result chains by board count:', error);
            throw error;
        }
    }

    /**
     * Find chains within board count range
     */
    async findByBoardCountRange(minBoards: number, maxBoards: number, limit: number = 10): Promise<IResultChain[]> {
        try {
            return await ResultChain.find({
                totalBoardCount: { $gte: minBoards, $lte: maxBoards }
            })
            .sort({ createdAt: -1 })
            .limit(limit);
        } catch (error) {
            console.error('❌ Failed to find result chains by board count range:', error);
            throw error;
        }
    }

    /**
     * Advanced player chain selection with multiple criteria
     */
    async findForPlayer(criteria: {
        baseBetAmount?: number;
        minBoardCount?: number;
        maxBoardCount?: number;
        betLevel?: number;
        coinValue?: number;
    }, limit: number = 10): Promise<IResultChain[]> {
        try {
            const query: any = {};

            if (criteria.baseBetAmount !== undefined) {
                query.baseBetAmount = criteria.baseBetAmount;
            }
            if (criteria.betLevel !== undefined) {
                query.betLevel = criteria.betLevel;
            }
            if (criteria.coinValue !== undefined) {
                query.coinValue = criteria.coinValue;
            }
            if (criteria.minBoardCount !== undefined || criteria.maxBoardCount !== undefined) {
                query.totalBoardCount = {};
                if (criteria.minBoardCount !== undefined) {
                    query.totalBoardCount.$gte = criteria.minBoardCount;
                }
                if (criteria.maxBoardCount !== undefined) {
                    query.totalBoardCount.$lte = criteria.maxBoardCount;
                }
            }

            return await ResultChain.find(query)
                .sort({ createdAt: -1 })
                .limit(limit);
        } catch (error) {
            console.error('❌ Failed to find result chains for player:', error);
            throw error;
        }
    }
}