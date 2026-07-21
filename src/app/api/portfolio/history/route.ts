import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import PortfolioSnapshot from '@/models/PortfolioSnapshot';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (req: NextRequest, userId: string) => {
  try {
    await connectToDatabase();
    const snapshots = await PortfolioSnapshot.find({ userId })
      .sort({ timestamp: 1 })
      .lean();
    return NextResponse.json(snapshots);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
