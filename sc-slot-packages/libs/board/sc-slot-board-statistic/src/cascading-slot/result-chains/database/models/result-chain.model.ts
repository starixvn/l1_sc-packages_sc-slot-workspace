import mongoose, { Schema, Document, Model } from 'mongoose';

// Simplified Result Chain Interface
export interface IResultChain extends Document {
    name: string;
    boardsData: any[];
    betLevel: number;
    coinValue: number;
    totalBoardCount: number;
    baseBetAmount: number;
    volatility?: number; // Game volatility: 1=Low, 2=MediumLow, 3=Medium, 4=High, 5=VeryHigh
    patternType?: string; // Pattern type for easier filtering
    inactive: boolean; // Chain inactive status - only inactive chains can be assigned to games
    createdAt: Date;
}

// Static methods interface
export interface IResultChainModel extends Model<IResultChain> {
    findByName(name: string): Promise<IResultChain | null>;
    findRecent(limit?: number): Promise<IResultChain[]>;
}

// Simplified Schema Definition
const ResultChainSchema = new Schema<IResultChain>({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        maxlength: 255,
        index: true
    },
    boardsData: [{
        type: Schema.Types.Mixed,
        required: true
    }],
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
    totalBoardCount: {
        type: Number,
        required: true,
        min: 1,
        index: true
    },
    baseBetAmount: {
        type: Number,
        required: true,
        min: 0.01,
        index: true
    },
    volatility: {
        type: Number,
        enum: [1, 2, 3, 4, 5], // 1=Low, 2=MediumLow, 3=Medium, 4=High, 5=VeryHigh
        index: true
    },
    patternType: {
        type: String,
        enum: ['comeback', 'cliffhanger', 'discovery', 'tease', 'wave'],
        index: true
    },
    inactive: {
        type: Boolean,
        default: false,
        index: true,
        required: true
    }
}, {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'result_chains'
});

// Simple indexes for performance
ResultChainSchema.index({ name: 1 });
ResultChainSchema.index({ createdAt: -1 });
ResultChainSchema.index({ active: 1 }); // For filtering active/inactive chains
ResultChainSchema.index({ betLevel: 1, coinValue: 1 }); // For player bet selection
ResultChainSchema.index({ totalBoardCount: 1 }); // For board count filtering
ResultChainSchema.index({ baseBetAmount: 1 }); // For bet amount filtering
ResultChainSchema.index({ volatility: 1, patternType: 1 }); // For volatility + pattern filtering
ResultChainSchema.index({ betLevel: 1, coinValue: 1, totalBoardCount: 1, baseBetAmount: 1 }); // Composite index for player selection
ResultChainSchema.index({ volatility: 1, betLevel: 1, coinValue: 1, totalBoardCount: 1 }); // Chain assignment query optimization
ResultChainSchema.index({ active: 1, volatility: 1, patternType: 1 }); // For active chain filtering with game params

// Static methods
ResultChainSchema.statics.findByName = function(name: string) {
    return this.findOne({ name });
};

ResultChainSchema.statics.findRecent = function(limit: number = 10) {
    return this.find({}).sort({ createdAt: -1 }).limit(limit);
};

// Post-save middleware
ResultChainSchema.post('save', function(doc) {
    const boardCount = doc.boardsData?.length || 0;
    console.log(`📊 Result chain saved: ${doc.name} (${boardCount} boards, baseBet: ${doc.baseBetAmount})`);
});

// Create and export the model
export const ResultChain = mongoose.model<IResultChain, IResultChainModel>('ResultChain', ResultChainSchema);
export default ResultChain;
