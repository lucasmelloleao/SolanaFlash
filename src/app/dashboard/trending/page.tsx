'use client';

import { useState, useEffect } from 'react';
import { Search, TrendingUp, TrendingDown, RefreshCcw, Activity, PlayCircle, X, Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

interface CoinData {
  symbol: string;
  priceChangePercent: string;
  lastPrice: string;
  volume: string;
  quoteVolume: string;
}

export default function TrendingCoinsPage() {
  const [loading, setLoading] = useState(false);
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [error, setError] = useState<string | null>(null);

  type StrategyStatus = 'creating' | 'testing' | 'success' | 'error';
  interface ActiveStrategy {
    symbol: string;
    strategyId?: string;
    status: StrategyStatus;
    message?: string;
  }

  // Active Strategies State
  const [activeStrategies, setActiveStrategies] = useState<Record<string, ActiveStrategy>>({});
  
  const [wallets, setWallets] = useState<any[]>([]);

  useEffect(() => {
    const fetchWallets = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/wallets', {
          headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
        });
        if (res.ok) {
          const data = await res.json();
          setWallets(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchWallets();
  }, []);

  useEffect(() => {
    const testingStrategies = Object.values(activeStrategies).filter(s => s.status === 'testing');
    if (testingStrategies.length === 0) return;

    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/strategies', {
          headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
        });
        if (res.ok) {
          const strats = await res.json();
          setActiveStrategies(prev => {
            const next = { ...prev };
            let changed = false;
            for (const key of Object.keys(next)) {
              const s = next[key];
              if (s.status === 'testing' && s.strategyId) {
                const stillExists = strats.find((strat: any) => strat._id === s.strategyId);
                if (!stillExists) {
                  next[key] = { ...s, status: 'success' };
                  changed = true;
                }
              }
            }
            return changed ? next : prev;
          });
        }
      } catch (e) {
        console.error('Erro ao checar status da estratégia:', e);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [activeStrategies]);

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
    setActiveStrategies({});
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
    const cleanSymbol = symbol.replace('USDT', '');
    const active = activeStrategies[cleanSymbol];
    
    // Block click if it is already creating or testing
    if (active?.status === 'creating' || active?.status === 'testing') return;

    setActiveStrategies(prev => ({
      ...prev,
      [cleanSymbol]: { symbol: cleanSymbol, status: 'creating' }
    }));

    const tokenMint = KNOWN_SOLANA_TOKENS[cleanSymbol.toUpperCase()];
    
    if (!tokenMint) {
      setActiveStrategies(prev => ({
        ...prev,
        [cleanSymbol]: { symbol: cleanSymbol, status: 'error', message: `Token não mapeado.` }
      }));
      return;
    }

    if (wallets.length === 0) {
      setActiveStrategies(prev => ({
        ...prev,
        [cleanSymbol]: { symbol: cleanSymbol, status: 'error', message: `Nenhuma carteira.` }
      }));
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/strategies', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: `Temp ${cleanSymbol} Arb`,
          walletId: wallets[0]._id,
          tokenBMint: tokenMint,
          tokenBSymbol: cleanSymbol.toUpperCase(),
          borrowAmount: 100,
          minProfitUsdc: 0,
          provider: 'jupiter',
          lendingProvider: 'solend',
          temporary: true
        })
      });
      const data = await res.json();
      if (res.ok) {
        setActiveStrategies(prev => ({
          ...prev,
          [cleanSymbol]: { symbol: cleanSymbol, status: 'testing', strategyId: data._id }
        }));
      } else {
        setActiveStrategies(prev => ({
          ...prev,
          [cleanSymbol]: { symbol: cleanSymbol, status: 'error', message: 'Erro na API' }
        }));
      }
    } catch (err) {
      setActiveStrategies(prev => ({
        ...prev,
        [cleanSymbol]: { symbol: cleanSymbol, status: 'error', message: 'Erro de conexão' }
      }));
    }
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
          disabled={loading}
          className={clsx(
            "flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white transition-all duration-300",
            loading
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
            const active = activeStrategies[cleanSymbol];
            const isProcessing = active?.status === 'creating' || active?.status === 'testing';
            
            return (
              <div 
                key={coin.symbol}
                onClick={() => handleCoinClick(coin.symbol)}
                className={clsx(
                  "group relative bg-slate-900/60 border rounded-2xl p-5 transition-all duration-300 overflow-hidden cursor-pointer",
                  active?.status === 'testing'
                    ? "border-indigo-500 shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-500/50" 
                    : active?.status === 'success'
                    ? "border-emerald-500 shadow-lg shadow-emerald-500/20"
                    : "border-slate-800 hover:bg-slate-800/80 hover:border-slate-700 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1",
                  isProcessing && "opacity-90 pointer-events-none"
                )}
              >
                {/* Glow Effect */}
                <div className={clsx(
                  "absolute -top-10 -right-10 w-24 h-24 rounded-full blur-3xl opacity-20 transition-opacity",
                  active?.status === 'testing' ? "opacity-50 bg-indigo-500" : "group-hover:opacity-40",
                  (!active || active.status === 'success') && (isPositive ? "bg-emerald-500" : "bg-rose-500")
                )} />

                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-wider flex items-center gap-2">
                      {cleanSymbol}
                      {active?.status === 'testing' && <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />}
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
                    <div className="text-xs font-medium flex items-center gap-1 transition-opacity">
                      {active?.status === 'creating' && <span className="text-indigo-400 flex items-center gap-1"><RefreshCcw className="w-3 h-3 animate-spin" /> Criando...</span>}
                      {active?.status === 'testing' && <span className="text-indigo-400 flex items-center gap-1"><Activity className="w-3 h-3 animate-pulse" /> Testando...</span>}
                      {active?.status === 'success' && <span className="text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Concluído</span>}
                      {active?.status === 'error' && <span className="text-rose-400 flex items-center gap-1" title={active.message}><AlertTriangle className="w-3 h-3" /> Erro</span>}
                      {!active && <span className="text-indigo-400 opacity-0 group-hover:opacity-100 flex items-center gap-1"><Zap className="w-3 h-3" /> Testar</span>}
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


    </div>
  );
}
