import mongoose, { Schema, Document, Model } from 'mongoose';

// Result Chain Statistics Interface
export interface IResultChainStatistics extends Document {
    resultChainName: string; // Reference to result chain by name
    patternType: string;
    boardCount: number;
    targetRTP: number;
    actualRTP: number;
    rtpVariance: number;
    totalWagered: number;
    totalWon: number;
    generationAttempts: number;
    generationDuration: number; // milliseconds
    configJson: any;
    tumbleStats: any;
    generationStats: any;
    status: 'active' | 'archived' | 'testing';
    createdBy?: string;
    betLevel: number;
    coinValue: number;
    volatility?: number; // Game volatility: 1=Low, 2=MediumLow, 3=Medium, 4=High, 5=VeryHigh
    // Multiplier statistics for analysis
    totalWonWithMultipliers?: number;     // Total wins including multiplier effects
    totalWonWithoutMultipliers?: number;  // Total wins before multiplier effects
    multiplierHitCount?: number;          // Number of boards with multipliers > 0
    averageMultiplier?: number;           // Average multiplier value when multipliers are present
    maxMultiplier?: number;               // Maximum multiplier value in chain
    createdAt: Date;
    
    // Instance methods
    getRTPString(): string;
    getVarianceString(): string;
    getSummary(): any;
}

// Static methods interface
export interface IResultChainStatisticsModel extends Model<IResultChainStatistics> {
    findByPattern(pattern: string): Promise<IResultChainStatistics[]>;
    findByChainName(chainName: string): Promise<IResultChainStatistics | null>;
    findSuitableForAssignment(patternTypes?: string[], boardCountRange?: [number, number]): Promise<IResultChainStatistics[]>;
    getStatistics(): Promise<any[]>;
    getPatternDistribution(): Promise<any[]>;
}

// Schema Definition
const ResultChainStatisticsSchema = new Schema<IResultChainStatistics>({
    resultChainName: {
        type: String,
        required: true,
        unique: true, // One stats record per chain
        trim: true,
        maxlength: 255,
        index: true
    },
    patternType: {
        type: String,
        required: true,
        enum: ['comeback', 'cliffhanger', 'discovery', 'tease', 'wave'],
        index: true
    },
    boardCount: {
        type: Number,
        required: true,
        min: 1,  // Allow test chains with fewer boards
        max: 150,
        index: true
    },
    targetRTP: {
        type: Number,
        required: true,
        default: 0.97,
        min: 0.94,
        max: 0.99
    },
    actualRTP: {
        type: Number,
        required: true,
        min: 0,
        max: 2.0,
        index: true
    },
    rtpVariance: {
        type: Number,
        required: true,
        min: 0,
        max: 1.0
    },
    totalWagered: {
        type: Number,
        required: true,
        min: 0
    },
    totalWon: {
        type: Number,
        required: true,
        min: 0
    },
    generationAttempts: {
        type: Number,
        required: true,
        min: 1
    },
    generationDuration: {
        type: Number,
        required: true,
        min: 0
    },
    configJson: {
        type: Schema.Types.Mixed,
        required: true
    },
    tumbleStats: {
        type: Schema.Types.Mixed,
        required: true
    },
    generationStats: {
        type: Schema.Types.Mixed,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'archived', 'testing'],
        default: 'active',
        index: true
    },
    createdBy: {
        type: String,
        trim: true,
        maxlength: 255
    },
    betLevel: {
        type: Number,
        required: true,
        min: 0.1,
        max: 10.0,
        default: 0.5,
        index: true
    },
    coinValue: {
        type: Number,
        required: true,
        min: 0.01,
        max: 10.0,  // Increased from 1.0 to 10.0 to allow higher coin values
        default: 0.1,
        index: true
    },
    volatility: {
        type: Number,
        enum: [1, 2, 3, 4, 5], // 1=Low, 2=MediumLow, 3=Medium, 4=High, 5=VeryHigh
        index: true
    },
    // Multiplier statistics for analysis
    totalWonWithMultipliers: {
        type: Number,
        min: 0,
        index: true
    },
    totalWonWithoutMultipliers: {
        type: Number,
        min: 0,
        index: true
    },
    multiplierHitCount: {
        type: Number,
        min: 0,
        index: true
    },
    averageMultiplier: {
        type: Number,
        min: 0
    },
    maxMultiplier: {
        type: Number,
        min: 0,
        index: true
    }
}, {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'result_chain_statistics'
});

// Indexes for performance
ResultChainStatisticsSchema.index({ patternType: 1, actualRTP: -1 });
ResultChainStatisticsSchema.index({ status: 1, createdAt: -1 });
ResultChainStatisticsSchema.index({ boardCount: 1, targetRTP: 1 });
ResultChainStatisticsSchema.index({ betLevel: 1, coinValue: 1 }); // Bet parameters index
ResultChainStatisticsSchema.index({ volatility: 1, patternType: 1 }); // Volatility + pattern index
ResultChainStatisticsSchema.index({ resultChainName: 'text' }); // Text search

// Virtual properties
ResultChainStatisticsSchema.virtual('rtpAccuracy').get(function(this: IResultChainStatistics) {
    return Math.abs(this.actualRTP - this.targetRTP);
});

ResultChainStatisticsSchema.virtual('isRTPWithinTolerance').get(function(this: IResultChainStatistics) {
    const tolerance = this.configJson?.tolerance || 0.02;
    const rtpAccuracy = Math.abs(this.actualRTP - this.targetRTP);
    return rtpAccuracy <= tolerance;
});

// Instance methods
ResultChainStatisticsSchema.methods.getRTPString = function(this: IResultChainStatistics): string {
    return `${(this.actualRTP * 100).toFixed(2)}%`;
};

ResultChainStatisticsSchema.methods.getVarianceString = function(this: IResultChainStatistics): string {
    return `${(this.rtpVariance * 100).toFixed(2)}%`;
};

ResultChainStatisticsSchema.methods.getSummary = function(this: IResultChainStatistics): any {
    const rtpAccuracy = Math.abs(this.actualRTP - this.targetRTP);
    const tolerance = this.configJson?.tolerance || 0.02;
    const withinTolerance = rtpAccuracy <= tolerance;
    
    return {
        id: this._id,
        chainName: this.resultChainName,
        pattern: this.patternType,
        boards: this.boardCount,
        targetRTP: `${(this.targetRTP * 100).toFixed(1)}%`,
        actualRTP: `${(this.actualRTP * 100).toFixed(2)}%`,
        variance: `${(this.rtpVariance * 100).toFixed(2)}%`,
        betLevel: this.betLevel,
        coinValue: this.coinValue,
        status: this.status,
        withinTolerance,
        createdAt: this.createdAt
    };
};

// Static methods
ResultChainStatisticsSchema.statics.findByPattern = function(pattern: string) {
    return this.find({ patternType: pattern, status: 'active' }).sort({ actualRTP: -1 });
};

ResultChainStatisticsSchema.statics.findByChainName = function(chainName: string) {
    return this.findOne({ resultChainName: chainName });
};

ResultChainStatisticsSchema.statics.findSuitableForAssignment = function(
    patternTypes?: string[], 
    boardCountRange?: [number, number]
) {
    const query: any = { status: 'active' };
    
    if (patternTypes && patternTypes.length > 0) {
        query.patternType = { $in: patternTypes };
    }
    
    if (boardCountRange) {
        query.boardCount = { 
            $gte: boardCountRange[0], 
            $lte: boardCountRange[1] 
        };
    }
    
    return this.find(query).sort({ actualRTP: -1, createdAt: -1 });
};

ResultChainStatisticsSchema.statics.getStatistics = function() {
    return this.aggregate([
        {
            $group: {
                _id: null,
                totalChains: { $sum: 1 },
                activeChains: { 
                    $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } 
                },
                testingChains: { 
                    $sum: { $cond: [{ $eq: ['$status', 'testing'] }, 1, 0] } 
                },
                archivedChains: { 
                    $sum: { $cond: [{ $eq: ['$status', 'archived'] }, 1, 0] } 
                },
                averageRTP: { $avg: '$actualRTP' },
                averageBoardCount: { $avg: '$boardCount' },
                minCreatedAt: { $min: '$createdAt' },
                maxCreatedAt: { $max: '$createdAt' }
            }
        },
        {
            $project: {
                _id: 0,
                totalChains: 1,
                activeChains: 1,
                testingChains: 1,
                archivedChains: 1,
                averageRTP: { $round: ['$averageRTP', 4] },
                averageBoardCount: { $round: ['$averageBoardCount', 0] },
                firstChainCreated: '$minCreatedAt',
                lastChainCreated: '$maxCreatedAt'
            }
        }
    ]);
};

ResultChainStatisticsSchema.statics.getPatternDistribution = function() {
    return this.aggregate([
        { $match: { status: 'active' } },
        {
            $group: {
                _id: '$patternType',
                count: { $sum: 1 },
                averageRTP: { $avg: '$actualRTP' },
                averageBoardCount: { $avg: '$boardCount' },
                totalWagered: { $sum: '$totalWagered' },
                totalWon: { $sum: '$totalWon' }
            }
        },
        {
            $project: {
                pattern: '$_id',
                _id: 0,
                count: 1,
                averageRTP: { $round: ['$averageRTP', 4] },
                averageBoardCount: { $round: ['$averageBoardCount', 0] },
                totalWagered: { $round: ['$totalWagered', 2] },
                totalWon: { $round: ['$totalWon', 2] },
                actualRTP: { 
                    $cond: [
                        { $gt: ['$totalWagered', 0] },
                        { $round: [{ $divide: ['$totalWon', '$totalWagered'] }, 4] },
                        0
                    ]
                }
            }
        },
        { $sort: { count: -1 } }
    ]);
};

// Pre-save middleware
ResultChainStatisticsSchema.pre('save', function(next) {
    // Calculate RTP variance before saving
    this.rtpVariance = Math.abs(this.actualRTP - this.targetRTP);
    next();
});

// Post-save middleware
ResultChainStatisticsSchema.post('save', function(doc) {
    const rtpString = `${(doc.actualRTP * 100).toFixed(2)}%`;
    console.log(`📈 Chain statistics saved: ${doc.resultChainName} (${rtpString})`);
});

// Create and export the model
export const ResultChainStatistics = mongoose.model<IResultChainStatistics, IResultChainStatisticsModel>('ResultChainStatistics', ResultChainStatisticsSchema);
export default ResultChainStatistics;
