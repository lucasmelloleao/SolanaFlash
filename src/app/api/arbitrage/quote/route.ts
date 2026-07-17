import { NextRequest, NextResponse } from 'next/server';
import { QuoteService } from '@/bot/services/QuoteService';
import { withAuth } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import SystemStatus from '@/models/SystemStatus';
import Wallet from '@/models/Wallet';
import { SolanaService } from '@/bot/services/SolanaService';
import { TransactionBuilder } from '@/bot/services/TransactionBuilder';
import { getSolendPoolConfig } from '@/bot/config/solend-pools';
import FlashLoanTrade from '@/models/FlashLoanTrade';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

export const POST = withAuth(async (req: NextRequest, userId: string) => {
    try {
        await connectToDatabase();
        const { mint, amount = 100000000 } = await req.json(); // default 100 USDC
        
        const quotes = await QuoteService.getQuotes(mint, amount, false);
        
        if (!quotes) {
            return NextResponse.json({ success: false, reason: 'Nenhuma rota de swap encontrada' });
        }
        
        const flashLoanFee = Math.ceil((amount * 9) / 10000);
        const finalAmount = parseInt(quotes.quoteB.outAmount);
        
        // Custo aproximado de execução (Jito tip + Priority fee)
        const cachedSolPriceUsdc = await QuoteService.fetchSolPriceUsdc();
        const jitoTipCostUsdc = (25000 / 1e9) * cachedSolPriceUsdc;
        const priorityFeeCostUsdc = ((500000 * 40000) / 1e15) * cachedSolPriceUsdc;
        const executionCostUsdc = (jitoTipCostUsdc + priorityFeeCostUsdc) * 1e6; 
        
        const profit = finalAmount - (amount + flashLoanFee + executionCostUsdc);
        
        // Check execution parameters
        const status = await SystemStatus.findOne({ id: 'global' });
        const botMode = status?.botMode || 'simulated';

        if (botMode === 'live' && profit > 0) {
            const walletDoc = await Wallet.findOne({ userId });
            if (!walletDoc) {
                return NextResponse.json({ 
                    success: true, 
                    profitUsdc: profit / 1e6, 
                    reason: 'Carteira de execução não encontrada para o modo Live.' 
                });
            }

            try {
                const keypair = Keypair.fromSecretKey(bs58.decode(walletDoc.privateKey));
                const poolConfig = getSolendPoolConfig(mint);
                const latestJitoTipLamports = await SolanaService.getDynamicJitoTip();
                
                // Fetch swap instructions
                const instructionsARes = await QuoteService.getSwapInstructions(quotes.quoteA, keypair.publicKey.toBase58(), false);
                const instructionsBRes = await QuoteService.getSwapInstructions(quotes.quoteB, keypair.publicKey.toBase58(), false);
                
                const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
                const usdcAta = SolanaService.deriveAssociatedTokenAddress(USDC_MINT, keypair.publicKey);

                const result = await TransactionBuilder.buildAndSendArbitrage(
                    keypair,
                    amount,
                    flashLoanFee,
                    latestJitoTipLamports,
                    instructionsARes,
                    instructionsBRes,
                    usdcAta,
                    poolConfig,
                    'solend'
                );

                if (result) {
                    await FlashLoanTrade.create({
                        userId,
                        tokenBorrowed: 'USDC',
                        amountBorrowed: amount / 1e6,
                        expectedProfit: profit / 1e6,
                        flashLoanFee: flashLoanFee / 1e6,
                        status: result.jitoBundleId ? 'completed' : 'failed',
                        txid: result.txid,
                        gasFee: latestJitoTipLamports / 1e9,
                        jitoBundleId: result.jitoBundleId,
                        routeInfo: { quoteA: quotes.quoteA, quoteB: quotes.quoteB }
                    });

                    if (result.jitoBundleId) {
                        return NextResponse.json({ 
                            success: true, 
                            profitUsdc: profit / 1e6, 
                            reason: `EXECUTADO! Bundle ID: ${result.jitoBundleId.substring(0,8)}...` 
                        });
                    } else {
                        return NextResponse.json({ 
                            success: false, 
                            profitUsdc: profit / 1e6, 
                            reason: 'Jito rejeitou o bundle na execução Live.' 
                        });
                    }
                }
            } catch (txError: any) {
                console.error("Live execution error:", txError);
                return NextResponse.json({ 
                    success: false, 
                    profitUsdc: profit / 1e6, 
                    reason: `Erro na execução: ${txError.message}` 
                });
            }
        }

        return NextResponse.json({ 
            success: true, 
            profitUsdc: profit / 1e6, 
            routeA: quotes.quoteA.routePlan?.length || 1,
            routeB: quotes.quoteB.routePlan?.length || 1,
            reason: botMode === 'live' ? 'Lucro insuficiente para execução' : 'Simulação concluída'
        });
    } catch (e: any) {
        console.error("CRITICAL ERROR IN ROUTE.TS POST:", e);
        return NextResponse.json({ success: false, reason: e.message || 'Internal Error' }, { status: 500 });
    }
});
