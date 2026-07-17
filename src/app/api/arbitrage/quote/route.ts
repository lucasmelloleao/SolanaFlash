import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const SOL_MINT = 'So11111111111111111111111111111111111111112';

export const POST = withAuth(async (req: NextRequest, userId: string) => {
    try {
        const { mint, amount = 100000000 } = await req.json(); // default 100 USDC
        const slippageBps = 100; // 1%
        
        // 1. Fetch Quote A (USDC -> Token)
        const quoteAUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${USDC_MINT}&outputMint=${mint}&amount=${amount}&slippageBps=${slippageBps}`;
        const quoteARes = await fetch(quoteAUrl);
        const quoteA = await quoteARes.json();
        
        if (!quoteA || quoteA.error) {
            return NextResponse.json({ success: false, reason: 'Nenhuma rota de swap encontrada (A)' });
        }

        // 2. Fetch Quote B (Token -> USDC)
        const quoteBUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${mint}&outputMint=${USDC_MINT}&amount=${quoteA.outAmount}&slippageBps=${slippageBps}`;
        const quoteBRes = await fetch(quoteBUrl);
        const quoteB = await quoteBRes.json();

        if (!quoteB || quoteB.error) {
             return NextResponse.json({ success: false, reason: 'Nenhuma rota de swap encontrada (B)' });
        }
        
        const flashLoanFee = Math.ceil((amount * 9) / 10000);
        const finalAmount = parseInt(quoteB.outAmount);
        
        // Custo aproximado de execução (Jito tip + Priority fee)
        const solQuoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${SOL_MINT}&outputMint=${USDC_MINT}&amount=1000000000&slippageBps=100`;
        const solQuoteRes = await fetch(solQuoteUrl);
        const solQuote = await solQuoteRes.json();
        
        const cachedSolPriceUsdc = solQuote.outAmount ? (parseInt(solQuote.outAmount) / 1e6) : 150;

        const jitoTipCostUsdc = (25000 / 1e9) * cachedSolPriceUsdc;
        const priorityFeeCostUsdc = ((500000 * 40000) / 1e15) * cachedSolPriceUsdc;
        const executionCostUsdc = (jitoTipCostUsdc + priorityFeeCostUsdc) * 1e6; 
        
        const profit = finalAmount - (amount + flashLoanFee + executionCostUsdc);

        return NextResponse.json({ 
            success: true, 
            profitUsdc: profit / 1e6, 
            routeA: quoteA.routePlan?.length || 1,
            routeB: quoteB.routePlan?.length || 1,
            reason: 'Simulação de arbitragem concluída (A execução é gerenciada pelo bot externo)'
        });
    } catch (e: any) {
        console.error("CRITICAL ERROR IN ROUTE.TS POST:", e);
        return NextResponse.json({ success: false, reason: e.message || 'Internal Error' }, { status: 500 });
    }
});
