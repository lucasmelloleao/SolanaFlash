'use client';

import { useState, useEffect, useRef } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
type TokenBalance = {
  symbol: string;
  mint: string;
  balance: number;
}

type Wallet = {
  _id: string;
  acronym: string;
  publicKey: string;
};

type WalletBalance = Wallet & {
  balanceSol: number | null;
  tokens?: TokenBalance[];
  totalValueUsd?: number;
};

export default function DashboardOverview() {
  const [wallets, setWallets] = useState<WalletBalance[]>([]);
  const [totalWallets, setTotalWallets] = useState(0);
  const [loading, setLoading] = useState(true);
  const [totalBalanceUsdc, setTotalBalanceUsdc] = useState<number | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [cexBalances, setCexBalances] = useState<any[]>([]);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    
    const fetchDashboardData = async () => {
      try {
        const res = await fetch('/api/wallets', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const data: Wallet[] = await res.json();
          setTotalWallets(data.length);
          
          // Fetch balance for each wallet from Solana mainnet RPC
          const walletsWithBalances: WalletBalance[] = await Promise.all(data.map(async (w) => {
            try {
              const rpcRes = await fetch(`/api/solana/balance?publicKey=${w.publicKey}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
              });
              if (!rpcRes.ok) throw new Error('Failed to fetch balance');
              const rpcData = await rpcRes.json();
              return { ...w, balanceSol: rpcData.balanceSol ?? null, tokens: rpcData.tokens || [] };
            } catch (err) {
              return { ...w, balanceSol: null, tokens: [] };
            }
          }));

          // Calcular o total geral em USDC usando a Jupiter API
          const allMints = new Set<string>(['So11111111111111111111111111111111111111112']); // SOL mint
          walletsWithBalances.forEach(w => {
            w.tokens?.forEach((t: any) => allMints.add(t.mint));
          });

          let prices: Record<string, number> = {};
          try {
            // Filtrar apenas mints reais (não vazios)
            const ids = Array.from(allMints).filter(Boolean).join(',');
            
            // Usando nosso próprio backend para contornar problemas de CORS no navegador
            const priceRes = await fetch(`/api/prices?ids=${ids}`);
            if (priceRes.ok) {
              const returnedPrices = await priceRes.json();
              if (returnedPrices && typeof returnedPrices === 'object') {
                // Mescla os preços retornados com o objeto local
                prices = { ...prices, ...returnedPrices };
              }
            }
          } catch(e) {
            console.error("Falha ao buscar preços da API interna", e);
          }

          let totalUsd = 0;
          walletsWithBalances.forEach(w => {
             let walletUsd = 0;
             // Soma o valor do SOL
             walletUsd += (w.balanceSol || 0) * (prices['So11111111111111111111111111111111111111112'] || prices['SOL'] || 0);
             // Soma o valor de todos os tokens
             w.tokens?.forEach((t: any) => {
               if (t.symbol === 'USDC' || t.symbol === 'USDT') {
                 walletUsd += t.balance;
               } else {
                 walletUsd += t.balance * (prices[t.mint] || prices[t.symbol] || 0);
               }
             });
             w.totalValueUsd = walletUsd;
             totalUsd += walletUsd;
          });
          
          setWallets(walletsWithBalances);

          // Fetch portfolio history
          let latestCexTotalUsd = 0;
          try {
            const historyRes = await fetch('/api/portfolio/history', {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (historyRes.ok) {
              const history = await historyRes.json();
              const chartDataMap: Record<string, any> = {};
              const latestCexMap: Record<string, any> = {};
              
              history.forEach((snapshot: any) => {
                const dateObj = new Date(snapshot.timestamp);
                dateObj.setSeconds(0, 0);
                const timeKey = dateObj.getTime();
                
                if (!chartDataMap[timeKey]) {
                  chartDataMap[timeKey] = {
                    time: timeKey,
                    formattedTime: dateObj.toLocaleString(),
                    totalUsdValue: 0
                  };
                }
                chartDataMap[timeKey].totalUsdValue += snapshot.totalUsdValue;
                latestCexMap[snapshot.exchange] = snapshot;
              });

              Object.values(latestCexMap).forEach((snap: any) => {
                 latestCexTotalUsd += snap.totalUsdValue;
              });
              setCexBalances(Object.values(latestCexMap));

              const formattedChartData = Object.values(chartDataMap).sort((a: any, b: any) => a.time - b.time);
              formattedChartData.forEach(d => {
                 d.totalUsdValue += totalUsd;
              });
              setHistoryData(formattedChartData);
            }
          } catch(e) {
            console.error("Failed to fetch portfolio history", e);
          }

          setTotalBalanceUsdc(totalUsd + latestCexTotalUsd);

        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  const totalUsdc = wallets.reduce((acc, wallet) => {
    const usdcToken = wallet.tokens?.find(t => t.symbol === 'USDC' || t.symbol === 'USDT');
    return acc + (usdcToken ? usdcToken.balance : 0);
  }, 0);

  return (
    <div>
      <h3 className="text-2xl font-bold text-white mb-6">Overview</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <p className="text-sm font-medium text-slate-400 mb-1">Wallets & Corretoras</p>
          <p className="text-3xl font-bold text-white">{loading ? '...' : (wallets.length + cexBalances.length)}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <p className="text-sm font-medium text-slate-400 mb-1">Total Balance</p>
          <p className="text-3xl font-bold text-white">
            {loading || totalBalanceUsdc === null ? '...' : `$${totalBalanceUsdc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent"></div>
          <p className="text-sm font-medium text-slate-400 mb-1">Total Stablecoin Balance (USDC/USDT)</p>
          <p className="text-3xl font-bold text-emerald-400">
            {loading ? '...' : `$${totalUsdc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </p>
        </div>
      </div>

      <h3 className="text-xl font-bold text-white mb-4">Evolução Patrimonial</h3>
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm mb-8">
        <div style={{ width: '100%', height: '400px' }}>
          {historyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={historyData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorUsdMain" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="time" 
                  tick={{ fill: '#64748b' }}
                  tickFormatter={(val) => {
                    const d = new Date(val);
                    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                  }}
                />
                <YAxis 
                  tick={{ fill: '#64748b' }}
                  tickFormatter={(val) => `$${val}`}
                  domain={['auto', 'auto']}
                />
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
                <Tooltip 
                  formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Patrimônio (USD)']}
                  labelFormatter={(label: any) => new Date(label).toLocaleString()}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', color: '#f8fafc', borderRadius: '8px' }}
                  itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="totalUsdValue" 
                  stroke="#10b981" 
                  fillOpacity={1} 
                  fill="url(#colorUsdMain)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex justify-center items-center h-full">
              <p className="text-slate-500">Nenhum histórico registrado ainda.</p>
            </div>
          )}
        </div>
      </div>

      <h3 className="text-xl font-bold text-white mb-4">Connected Wallets Balances</h3>
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto shadow-sm">
        <table className="w-full text-left text-sm whitespace-nowrap md:whitespace-normal">
          <thead className="bg-slate-900/50 border-b border-slate-800 text-slate-400">
            <tr>
              <th className="px-6 py-4 font-medium">Acronym</th>
              <th className="px-6 py-4 font-medium">Public Key</th>
              <th className="px-6 py-4 font-medium text-right">Balances</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">Loading balances...</td></tr>
            ) : wallets.length === 0 ? (
              <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">No wallets connected.</td></tr>
            ) : wallets.map(wallet => (
              <tr key={wallet._id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4 font-medium text-white align-top pt-5">{wallet.acronym}</td>
                <td className="px-6 py-4 text-slate-400 font-mono text-xs align-top pt-5">{wallet.publicKey}</td>
                <td className="px-6 py-4 text-right align-top">
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-white text-lg">
                        {wallet.totalValueUsd !== undefined ? `$${wallet.totalValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '...'}
                      </span>
                      <span className="font-medium text-emerald-400">
                        {wallet.balanceSol !== null ? `${wallet.balanceSol.toFixed(4)} SOL` : 'Error loading'}
                      </span>
                    </div>
                    {wallet.tokens && wallet.tokens.length > 0 && (
                      <div className="flex flex-col items-end gap-1 mt-1 border-t border-slate-800/50 pt-2">
                        {wallet.tokens.map((token, idx) => (
                          <span key={idx} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded-md border border-slate-700 flex items-center gap-1">
                            <span className="text-white font-medium">{token.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                            <span className={token.symbol !== 'Unknown' ? 'text-indigo-400' : 'text-slate-500'}>{token.symbol}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="text-xl font-bold text-white mt-8 mb-4">Connected Exchanges Balances</h3>
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto shadow-sm mb-8">
        <table className="w-full text-left text-sm whitespace-nowrap md:whitespace-normal">
          <thead className="bg-slate-900/50 border-b border-slate-800 text-slate-400">
            <tr>
              <th className="px-6 py-4 font-medium">Exchange</th>
              <th className="px-6 py-4 font-medium text-right">Total USD</th>
              <th className="px-6 py-4 font-medium text-right">Balances</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">Loading balances...</td></tr>
            ) : cexBalances.length === 0 ? (
              <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">No exchange history found.</td></tr>
            ) : cexBalances.map((snap, idx) => (
              <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4 font-medium text-white align-top pt-5 capitalize">{snap.exchange}</td>
                <td className="px-6 py-4 text-right font-bold text-white text-lg align-top pt-5">
                  ${snap.totalUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 text-right align-top">
                  <div className="flex flex-col items-end gap-1">
                    {snap.balances && snap.balances.filter((b: any) => b.total > 0).map((b: any, bIdx: number) => (
                      <span key={bIdx} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded-md border border-slate-700 flex items-center gap-1">
                        <span className="text-white font-medium">{b.total.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                        <span className="text-indigo-400">{b.asset}</span>
                        <span className="text-slate-500 ml-1">(${b.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
