import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import ScalpingTrade from '@/models/ScalpingTrade';
import ScalpingStrategy from '@/models/ScalpingStrategy';
import redis from '@/lib/redis';

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

        // Limita a 50 trades mais recentes
        const trades = await ScalpingTrade.find({ userId: decoded.userId })
            .sort({ createdAt: -1 })
            .limit(50)
            .populate({ path: 'strategyId', model: ScalpingStrategy, select: 'name symbol' })
            .lean();

        // Buscar posições abertas no Redis para PnL em tempo real
        let activePositions: Record<string, any> = {};
        if (redis) {
            const positions = await redis.hgetall('hft:positions');
            for (const stratId in positions) {
                try {
                    const pos = JSON.parse(positions[stratId]);
                    if (pos.tradeId) {
                        activePositions[pos.tradeId] = pos;
                    }
                } catch (e) { }
            }
        }

        // Mesclar dados do Redis com os trades
        const mergedTrades = trades.map((trade: any) => {
            const tradeId = trade._id.toString();
            if (trade.status === 'in_position' && activePositions[tradeId]) {
                return {
                    ...trade,
                    realPnL: activePositions[tradeId].realPnL,
                    currentExitPrice: activePositions[tradeId].currentExitPrice
                };
            }
            return trade;
        });

        return NextResponse.json(mergedTrades);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const token = authHeader.split(' ')[1];
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'supersecret');
        
        await connectToDatabase();

        await ScalpingTrade.deleteMany({ 
            userId: decoded.userId,
            status: { $nin: ['in_position', 'entry_pending'] }
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
