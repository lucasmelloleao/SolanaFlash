import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const ids = url.searchParams.get('ids');

    if (!ids) {
      return NextResponse.json({ error: 'ids param is required' }, { status: 400 });
    }

    // Usando a DexScreener API pelo lado do servidor (Back-End)
    const priceRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${ids}`);
    if (!priceRes.ok) {
      throw new Error(`DexScreener API error: ${priceRes.statusText}`);
    }

    const priceData = await priceRes.json();
    let prices: Record<string, number> = {};
    let pricesLiquidity: Record<string, number> = {};

    if (priceData.pairs && Array.isArray(priceData.pairs)) {
      priceData.pairs.forEach((pair: any) => {
        const tokenAddress = pair.baseToken?.address;
        const priceUsd = parseFloat(pair.priceUsd);
        const liquidity = parseFloat(pair.liquidity?.usd || '0');
        
        if (tokenAddress && !isNaN(priceUsd)) {
          if (!prices[tokenAddress] || liquidity > (pricesLiquidity[tokenAddress] || 0)) {
            prices[tokenAddress] = priceUsd;
            pricesLiquidity[tokenAddress] = liquidity;
          }
        }
      });
    }

    return NextResponse.json(prices);
  } catch (error: any) {
    console.error('Prices API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
