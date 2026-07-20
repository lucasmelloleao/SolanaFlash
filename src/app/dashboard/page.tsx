'use client';

import { useState, useEffect, useRef } from 'react';

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
          const walletsWithBalances = await Promise.all(data.map(async (w) => {
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
            w.tokens?.forEach(t => allMints.add(t.mint));
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
             w.tokens?.forEach(t => {
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
          setTotalBalanceUsdc(totalUsd);

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
          <p className="text-sm font-medium text-slate-400 mb-1">Total Wallets</p>
          <p className="text-3xl font-bold text-white">{loading ? '...' : totalWallets}</p>
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
    </div>
  );
}
