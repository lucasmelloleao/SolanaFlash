import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import FlashLoanTrade from '@/models/FlashLoanTrade';
import { withAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req: NextRequest, userId: string) => {
  try {
    await connectToDatabase();
    
    // Limpeza: deleta trades que falharam OU ficaram pendentes/simulados há mais de 24 horas
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await FlashLoanTrade.deleteMany({
      userId,
      $or: [
        { status: 'failed' },
        { status: { $in: ['pending', 'simulated'] }, createdAt: { $lt: oneDayAgo } }
      ]
    });

    const trades = await FlashLoanTrade.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return NextResponse.json(trades);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
