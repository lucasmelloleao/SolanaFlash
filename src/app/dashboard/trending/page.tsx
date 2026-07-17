'use client';

import { useState, useEffect } from 'react';
import { Search, TrendingUp, TrendingDown, RefreshCcw, Activity, PlayCircle, X } from 'lucide-react';
import clsx from 'clsx';

interface CoinData {
  symbol: string;
  priceChangePercent: string;
  lastPrice: string;
  volume: string;
  quoteVolume: string;
}

interface TestResult {
  attempt: number;
  success: boolean;
  profitUsdc?: number;
  reason?: string;
}

export default function TrendingCoinsPage() {
  const [loading, setLoading] = useState(false);
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Simulation State
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  // Expanded Known Solana Mints for Binance Symbols
  const KNOWN_SOLANA_TOKENS: Record<string, string> = {
    'SOL': 'So11111111111111111111111111111111111111112',
    'RAY': '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    'BONK': 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    'WIF': 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
    'JUP': 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    'PYTH': 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3GBfWejP87qQ2U',
    'JTO': 'jtojtomepa8beP8AuQc6eP9fH63Kx5YxV5fJkFz7yTz',
    'BOME': 'ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82',
    'MEW': 'MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5',
    'TNSR': 'TNSRxcUxoT9xBG3de7PiJyTDYu7kskLqcpddZ3iVaA',
    'RENDER': 'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof',
    'HNT': 'hntyVP6YFm1Hg25TN9WGLqM12b8CQN3V5257eCAdtD1',
    'POPCAT': '7GCihgDB8fe6KNjn2g7hu4pGte2L4bT53G2r7Z4fN1hX',
    'WEN': 'WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCmB',
    'FIDA': 'EchesyfXePKdLtoiZSL8pBe8Myagvw8QA51oAi2LbbM',
    'ORCA': 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
    'GMT': '7i5KKsX2weiTkry7jA4ZwPERvCxPE14wP1K1r2p129o',
    'HONEY': 'HN7cABqLq46Es1jyNdFAJB5iBkCEENrczUaK7f5fW2F',
    'MOBILE': 'mb1eu7TzEcYmKqK4L2CGE6xH6jV7r2FBRw1Xg44kktD',
    'ACT': 'GJAFwWjJ3vnTsrQVabjBVK2TYB1YtRCQXRDfDgUnpump',
    'PNUT': '2qEHjDLDLbuBgRYvsxhc5D6uDWAivNFZGan56P1tpump',
    'MOODENG': 'ED5nyyWEzpPPiWimP8vYn79shM5hKx5E8Q79q2j6pump',
    'PONKE': '5z3EqYQo9HiCEs3R84RCDMu2n7anpDxRvqs28OQpump',
    'MYRO': 'HhJpBhRRn4g56VsyLuT8DL5Bv31HkXqsrahTTUCZeZg4',
    'SLERF': '7BgBvyjrZX1YKz4oh9mjb8ZScatkkwb8DzFx7LoiVkM3',
    'MUMU': '5LafQUrVco6o7k4HK1kQhZk5xRMBpWz64yW4Vz5upump',
    'IO': 'BZUcgidgA3QYc22sXzH3KADuCjK526D6y8JqfU6aT5L2',
    'NEON': 'NeonTjSjsuo3rexg9o6vHuZvcQ3M1P1Q7N1K2rRk3H6',
    'CLOUD': '11111111111111111111111111111111', // Placeholder if not matching
    'DRIFT': 'v18MIksww8FExW1X5F5vS1XvS1XvS1XvS1XvS1XvS1Xv' // Fallback
  };

  const fetchTrendingCoins = async () => {
    setLoading(true);
    setError(null);
    setSelectedCoin(null);
    setTestResults([]);
    try {
      const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
      if (!response.ok) throw new Error('Falha ao buscar dados da Binance API');
      
      const data: CoinData[] = await response.json();
      
      // Filter out low volume coins, reduced threshold to 500k to show more options
      const usdtPairs = data.filter(coin => 
        coin.symbol.endsWith('USDT') && 
        parseFloat(coin.quoteVolume) > 500000 
      );

      // Filter only coins that are in our known Solana map
      const solanaSupportedPairs = usdtPairs.filter(coin => {
        const cleanSymbol = coin.symbol.replace('USDT', '').toUpperCase();
        return Object.keys(KNOWN_SOLANA_TOKENS).includes(cleanSymbol);
      });

      const sorted = solanaSupportedPairs.sort((a, b) => {
        return Math.abs(parseFloat(b.priceChangePercent)) - Math.abs(parseFloat(a.priceChangePercent));
      });

      // Show up to 24 top volatile coins
      setCoins(sorted.slice(0, 24));
    } catch (err) {
      console.error(err);
      setError('Não foi possível carregar as moedas. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    if (num < 0.01) return num.toFixed(6);
    if (num < 1) return num.toFixed(4);
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatVolume = (vol: string) => {
    const num = parseFloat(vol);
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    return num.toFixed(0);
  };

  const handleCoinClick = async (symbol: string) => {
    if (isTesting) return;
    const cleanSymbol = symbol.replace('USDT', '');
    setSelectedCoin(cleanSymbol);
    setTestResults([]);
    setIsTesting(true);

    const tokenMint = KNOWN_SOLANA_TOKENS[cleanSymbol.toUpperCase()];
    
    if (!tokenMint) {
      setTestResults([{ attempt: 1, success: false, reason: `Token ${cleanSymbol} não suportado no simulador.` }]);
      setIsTesting(false);
      return;
    }

    let results: TestResult[] = [];
    
    for (let i = 1; i <= 10; i++) {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/arbitrage/quote', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ mint: tokenMint, amount: 100000000 }) // 100 USDC test
        });
        const data = await res.json();
        const newResult = {
          attempt: i,
          success: data.success,
          profitUsdc: data.profitUsdc,
          reason: data.reason
        };
        results = [...results, newResult];
        setTestResults(results);
      } catch (err) {
        const newResult = { attempt: i, success: false, reason: 'Erro de conexão' };
        results = [...results, newResult];
        setTestResults(results);
      }
      
      if (i < 10) await new Promise(r => setTimeout(r, 1000));
    }
    
    setIsTesting(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-sm">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-500" />
            Rastreador de Volatilidade
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Encontre as moedas com maior variação e clique para testar Flash Loans
          </p>
        </div>
        
        <button
          onClick={fetchTrendingCoins}
          disabled={loading || isTesting}
          className={clsx(
            "flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white transition-all duration-300",
            (loading || isTesting)
              ? "bg-slate-800 cursor-not-allowed opacity-80"
              : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5"
          )}
        >
          {loading ? (
            <RefreshCcw className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
          {loading ? 'Buscando...' : 'Buscar Alta Variação'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Grid de Moedas */}
      {coins.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {coins.map((coin, index) => {
            const changePercent = parseFloat(coin.priceChangePercent);
            const isPositive = changePercent >= 0;
            const cleanSymbol = coin.symbol.replace('USDT', '');
            const isSelected = selectedCoin === cleanSymbol;
            
            return (
              <div 
                key={coin.symbol}
                onClick={() => handleCoinClick(coin.symbol)}
                className={clsx(
                  "group relative bg-slate-900/60 border rounded-2xl p-5 transition-all duration-300 overflow-hidden cursor-pointer",
                  isSelected 
                    ? "border-indigo-500 shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-500/50" 
                    : "border-slate-800 hover:bg-slate-800/80 hover:border-slate-700 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1",
                  (isTesting && !isSelected) && "opacity-50 pointer-events-none"
                )}
              >
                {/* Glow Effect */}
                <div className={clsx(
                  "absolute -top-10 -right-10 w-24 h-24 rounded-full blur-3xl opacity-20 transition-opacity",
                  isSelected ? "opacity-50" : "group-hover:opacity-40",
                  isPositive ? "bg-emerald-500" : "bg-rose-500"
                )} />

                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-wider flex items-center gap-2">
                      {cleanSymbol}
                      {isSelected && isTesting && <RefreshCcw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />}
                    </h3>
                  </div>
                  <div className={clsx(
                    "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-md",
                    isPositive 
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  )}>
                    {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-slate-500 font-medium mb-1">Preço Atual</div>
                    <div className="text-2xl font-semibold text-white tracking-tight">
                      ${formatPrice(coin.lastPrice)}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-3 border-t border-slate-800/60">
                    <div className="text-xs text-slate-400">
                      Vol: <span className="text-slate-300">${formatVolume(coin.quoteVolume)}</span>
                    </div>
                    <div className="text-xs font-medium text-indigo-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <PlayCircle className="w-3 h-3" /> Testar
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        !loading && !error && (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4 bg-slate-900/30 rounded-2xl border border-slate-800 border-dashed">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <Activity className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Nenhum dado exibido</h3>
            <p className="text-slate-400 max-w-sm">
              Clique no botão acima para escanear o mercado.
            </p>
          </div>
        )
      )}

      {/* Simulation Results Panel */}
      {selectedCoin && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500"></div>
          
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <Activity className="w-5 h-5 text-indigo-400" />
              Simulação de Motor (10 tentativas)
              <span className="bg-indigo-500/20 text-indigo-300 text-xs px-2.5 py-1 rounded-md font-mono border border-indigo-500/30">
                {selectedCoin}/USDC
              </span>
            </h3>
            
            <button 
              onClick={() => { setSelectedCoin(null); setTestResults([]); }}
              className="text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => {
              const res = testResults[i];
              const isPending = !res && isTesting && i === testResults.length;
              const isWaiting = !res && !isPending;

              return (
                <div 
                  key={i} 
                  className={clsx(
                    "p-3 rounded-xl border text-sm flex flex-col items-center justify-center text-center h-24 transition-all duration-300",
                    isWaiting && "bg-slate-950 border-slate-800 text-slate-600",
                    isPending && "bg-indigo-950/30 border-indigo-500/50 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)]",
                    res?.success && (res.profitUsdc! > 0 ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-400" : "bg-slate-900 border-slate-700 text-slate-300"),
                    res && !res.success && "bg-rose-950/20 border-rose-500/20 text-rose-400/70"
                  )}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-60">
                    Tentativa {i + 1}
                  </div>
                  
                  {isWaiting && <span>Aguardando...</span>}
                  {isPending && <RefreshCcw className="w-4 h-4 animate-spin my-1" />}
                  
                  {res && (
                    <>
                      {res.success ? (
                        <div className="font-mono font-medium">
                          {res.profitUsdc! > 0 ? (
                            <span className="text-emerald-400">+{res.profitUsdc?.toFixed(4)}$</span>
                          ) : (
                            <span className="text-slate-400">{res.profitUsdc?.toFixed(4)}$</span>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs leading-tight line-clamp-2" title={res.reason}>
                          {res.reason}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
