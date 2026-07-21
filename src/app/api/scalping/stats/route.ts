import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import ScalpingTrade from '@/models/ScalpingTrade';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/solana-flash-bot';

async function connectToDatabase() {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(MONGODB_URI);
    }
}

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const token = authHeader.split(' ')[1];
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'supersecret');
        
        await connectToDatabase();

        const trades = await ScalpingTrade.find({ userId: decoded.userId }).lean();
        
        let totalOperations = 0;
        let successfulOperations = 0;
        let failedOperations = 0; // Negative PNL
        let totalPnlPercentage = 0;
        let totalUsdPnl = 0;
        let profitBySymbol: Record<string, number> = {};
        let statsBySymbol: Record<string, { profit: number; totalTrades: number; successfulTrades: number }> = {};

        trades.forEach(t => {
            if (t.status === 'success' || t.status === 'failed') {
                totalOperations++;
                const pnl = t.pnl || 0;
                
                let usdPnl = 0;
                if (t.exitPrice && t.entryPrice && t.amount) {
                    usdPnl = (t.exitPrice - t.entryPrice) * t.amount;
                }
                totalUsdPnl += usdPnl;

                if (!statsBySymbol[t.symbol]) {
                    statsBySymbol[t.symbol] = { profit: 0, totalTrades: 0, successfulTrades: 0 };
                }

                statsBySymbol[t.symbol].totalTrades++;
                
                if (pnl > 0) {
                    successfulOperations++;
                    statsBySymbol[t.symbol].successfulTrades++;
                } else if (pnl < 0) {
                    failedOperations++;
                }
                
                totalPnlPercentage += pnl;

                if (!profitBySymbol[t.symbol]) profitBySymbol[t.symbol] = 0;
                profitBySymbol[t.symbol] += pnl;
                statsBySymbol[t.symbol].profit += pnl;
            }
        });

        return NextResponse.json({
            totalOperations,
            successfulOperations,
            failedOperations,
            totalPnlPercentage,
            totalUsdPnl,
            profitBySymbol,
            statsBySymbol
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
