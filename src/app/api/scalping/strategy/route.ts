import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import ScalpingStrategy from '@/models/ScalpingStrategy';
import { withAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req: NextRequest, userId: string) => {
  try {
    await connectToDatabase();
    const strategies = await ScalpingStrategy.find({ userId }).sort({ createdAt: -1 });
    return NextResponse.json(strategies);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const POST = withAuth(async (req: NextRequest, userId: string) => {
  try {
    await connectToDatabase();
    const { name, exchangeKeyId, symbol, tradeSize, takeProfitPercentage, stopLossPercentage, maxSpreadPercentage, maxPositionTimeMs, bufferPercentage } = await req.json();

    if (!name || !exchangeKeyId || !symbol || !tradeSize || !takeProfitPercentage || !stopLossPercentage) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const strategy = await ScalpingStrategy.create({ 
      userId, 
      exchangeKeyId,
      name, 
      symbol, 
      tradeSize: Number(tradeSize),
      takeProfitPercentage: Number(takeProfitPercentage),
      stopLossPercentage: Number(stopLossPercentage),
      maxSpreadPercentage: maxSpreadPercentage !== undefined ? Number(maxSpreadPercentage) : 0.1,
      maxPositionTimeMs: maxPositionTimeMs ? Number(maxPositionTimeMs) : 30000,
      bufferPercentage: bufferPercentage ? Number(bufferPercentage) : 0.01
    });
    return NextResponse.json(strategy, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const PUT = withAuth(async (req: NextRequest, userId: string) => {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { id, active, tradeSize, takeProfitPercentage, stopLossPercentage, maxSpreadPercentage, name, exchangeKeyId, symbol, maxPositionTimeMs, bufferPercentage } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    }

    const updateData: any = {};
    if (active !== undefined) updateData.active = active;
    if (tradeSize !== undefined) updateData.tradeSize = Number(tradeSize);
    if (takeProfitPercentage !== undefined) updateData.takeProfitPercentage = Number(takeProfitPercentage);
    if (stopLossPercentage !== undefined) updateData.stopLossPercentage = Number(stopLossPercentage);
    if (maxSpreadPercentage !== undefined) updateData.maxSpreadPercentage = Number(maxSpreadPercentage);
    if (maxPositionTimeMs !== undefined) updateData.maxPositionTimeMs = Number(maxPositionTimeMs);
    if (bufferPercentage !== undefined) updateData.bufferPercentage = Number(bufferPercentage);
    if (name !== undefined) updateData.name = name;
    if (exchangeKeyId !== undefined) updateData.exchangeKeyId = exchangeKeyId;
    if (symbol !== undefined) updateData.symbol = symbol;

    const strategy = await ScalpingStrategy.findOneAndUpdate(
      { _id: id, userId },
      updateData,
      { new: true }
    );

    if (!strategy) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(strategy);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const DELETE = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await connectToDatabase();
    const strategy = await ScalpingStrategy.findOneAndDelete({ _id: id, userId });
    
    if (!strategy) return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
