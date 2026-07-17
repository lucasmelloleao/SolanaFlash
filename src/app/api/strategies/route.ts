import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import FlashLoanStrategy from '@/models/FlashLoanStrategy';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (req: NextRequest, userId: string) => {
  try {
    await connectToDatabase();
    const strategies = await FlashLoanStrategy.find({ userId });
    return NextResponse.json(strategies);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const POST = withAuth(async (req: NextRequest, userId: string) => {
  try {
    await connectToDatabase();
    const { name, walletId, tokenAMint, tokenBMint, tokenBSymbol, borrowAmount, minProfitUsdc, provider, temporary } = await req.json();

    if (!name || !walletId || !tokenBMint || !borrowAmount) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const strategy = await FlashLoanStrategy.create({ 
      userId, 
      walletId,
      name, 
      tokenAMint: tokenAMint || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 
      tokenBMint, 
      tokenBSymbol: tokenBSymbol || 'UNKNOWN',
      borrowAmount, 
      minProfitUsdc, 
      provider,
      temporary: temporary || false
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
    const { id, active, borrowAmount, minProfitUsdc, name, walletId, provider, lendingProvider, tokenBMint, tokenBSymbol } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    }

    const updateData: any = {};
    if (active !== undefined) updateData.active = active;
    if (borrowAmount !== undefined) updateData.borrowAmount = Number(borrowAmount);
    if (minProfitUsdc !== undefined) updateData.minProfitUsdc = Number(minProfitUsdc);
    if (name !== undefined) updateData.name = name;
    if (walletId !== undefined) updateData.walletId = walletId;
    if (provider !== undefined) updateData.provider = provider;
    if (lendingProvider !== undefined) updateData.lendingProvider = lendingProvider;
    if (tokenBMint !== undefined) updateData.tokenBMint = tokenBMint;
    if (tokenBSymbol !== undefined) updateData.tokenBSymbol = tokenBSymbol;

    const strategy = await FlashLoanStrategy.findOneAndUpdate(
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
    const strategy = await FlashLoanStrategy.findOneAndDelete({ _id: id, userId });
    
    if (!strategy) return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
