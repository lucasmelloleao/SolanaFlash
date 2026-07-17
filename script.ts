import fs from 'fs';
import axios from 'axios';

async function generateTokenMap() {
    try {
        console.log("Fetching Binance tickets...");
        const binanceRes = await axios.get('https://api.binance.com/api/v3/ticker/24hr');
        const binanceSymbols = binanceRes.data
            .filter((t: any) => t.symbol.endsWith('USDT') && parseFloat(t.quoteVolume) > 100000)
            .map((t: any) => t.symbol.replace('USDT', ''));
        
        console.log(`Found ${binanceSymbols.length} USDT pairs with >100k volume.`);

        // Since we can't reliably hit some jup URLs, let's use the list from CoinGecko or just a large hardcoded fallback map we generate
        // Actually, let's try the jupiter v6 tokens endpoint which usually works.
        const jupRes = await axios.get('https://quote-api.jup.ag/v6/tokens');
        const jupTokens = jupRes.data; // this is usually an array of mints or we need to find the correct endpoint. Wait, v6/tokens doesn't exist.
    } catch (e: any) {
        console.error(e.message);
    }
}
generateTokenMap();
