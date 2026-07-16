import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import TransactionLog from '@/models/Transaction';
import Wallet from '@/models/Wallet'; // Needed for populate
import { Connection } from '@solana/web3.js';

export const GET = withAuth(async (req: NextRequest, userId: string) => {
  try {
    await connectToDatabase();
    
    // Buscar transações pertencentes ao usuário e popular com o acrônimo da carteira
    const transactions = await TransactionLog.find({ userId })
      .populate('walletId', 'acronym publicKey')
      .sort({ createdAt: -1 })
      .limit(100); // Limitar a 100 recentes para performance

    return NextResponse.json(transactions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const PUT = withAuth(async (req: NextRequest, userId: string) => {
  try {
    await connectToDatabase();
    const { txid } = await req.json();

    if (!txid) return NextResponse.json({ error: 'txid is required' }, { status: 400 });

    const transaction = await TransactionLog.findOne({ txid, userId });
    if (!transaction) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });

    // Se já estiver sucesso ou falha, não precisa checar de novo
    if (transaction.status !== 'pending') {
      return NextResponse.json(transaction);
    }

    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    const signatureStatus = await connection.getSignatureStatus(txid, { searchTransactionHistory: true });

    if (signatureStatus && signatureStatus.value) {
      if (signatureStatus.value.err) {
        transaction.status = 'failed';
      } else if (signatureStatus.value.confirmationStatus === 'confirmed' || signatureStatus.value.confirmationStatus === 'finalized') {
        transaction.status = 'success';
      }
      await transaction.save();
    }

    return NextResponse.json(transaction);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
