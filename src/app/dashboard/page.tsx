'use client';

import { useState, useEffect } from 'react';

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
};

export default function DashboardOverview() {
  const [wallets, setWallets] = useState<WalletBalance[]>([]);
  const [totalWallets, setTotalWallets] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
          
          setWallets(walletsWithBalances);
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
          <p className="text-sm font-medium text-slate-400 mb-1">Total SOL Balance</p>
          <p className="text-3xl font-bold text-white">
            {loading ? '...' : wallets.reduce((acc, w) => acc + (w.balanceSol || 0), 0).toFixed(4)} SOL
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
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
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
                    <span className="font-medium text-emerald-400">
                      {wallet.balanceSol !== null ? `${wallet.balanceSol.toFixed(4)} SOL` : 'Error loading'}
                    </span>
                    {wallet.tokens && wallet.tokens.length > 0 && (
                      <div className="flex flex-col items-end gap-1 mt-1">
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
