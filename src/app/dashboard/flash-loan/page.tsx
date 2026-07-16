'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Zap, Settings, Play, Pause, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

const KNOWN_TOKENS = [
  { symbol: 'SOL', mint: 'So11111111111111111111111111111111111111112' },
  { symbol: 'USDC', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
  { symbol: 'USDT', mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' },
  { symbol: 'RAY', mint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R' },
  { symbol: 'BONK', mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' }
];

type Strategy = {
  _id: string;
  name: string;
  tokenBMint: string;
  tokenBSymbol?: string;
  borrowAmount: number;
  minProfitUsdc: number;
  provider: string;
  active: boolean;
}

export default function FlashLoanPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [name, setName] = useState('');
  const [tokenBMint, setTokenBMint] = useState(KNOWN_TOKENS[0].mint);
  const [borrowAmount, setBorrowAmount] = useState('');
  const [minProfitUsdc, setMinProfitUsdc] = useState('0');
  const [provider, setProvider] = useState('jupiter');
  const [botOnline, setBotOnline] = useState<boolean | null>(null);

  const [wallets, setWallets] = useState<any[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState('');

  const fetchStrategies = async () => {
    const res = await fetch('/api/strategies', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.ok) setStrategies(await res.json());
  };

  const fetchWallets = async () => {
    const res = await fetch('/api/wallets', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.ok) {
      const data = await res.json();
      setWallets(data);
      if (data.length > 0) setSelectedWalletId(data[0]._id);
    }
  };

  const checkBotStatus = async () => {
    try {
      const res = await fetch('/api/system/status', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBotOnline(data.botOnline);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { 
    fetchStrategies(); 
    fetchWallets();
    checkBotStatus();
    const interval = setInterval(checkBotStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWalletId) {
      alert('Please select an execution wallet.');
      return;
    }
    const tokenObj = KNOWN_TOKENS.find(t => t.mint === tokenBMint);
    const res = await fetch('/api/strategies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ name, walletId: selectedWalletId, tokenBMint, tokenBSymbol: tokenObj?.symbol || 'UNKNOWN', borrowAmount: Number(borrowAmount), minProfitUsdc: Number(minProfitUsdc), provider })
    });
    if (res.ok) {
      setName(''); setTokenBMint(KNOWN_TOKENS[0].mint); setBorrowAmount(''); setMinProfitUsdc('0');
      fetchStrategies();
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/strategies?id=${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.ok) fetchStrategies();
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const res = await fetch('/api/strategies', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ id, active: !currentActive })
    });
    if (res.ok) fetchStrategies();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-white">Flash Loan Strategies</h3>
      </div>

      {botOnline === false && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-4 shadow-sm">
          <AlertTriangle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-red-400 font-bold mb-1">Bot Engine is Paused</h4>
            <p className="text-red-200/80 text-sm">
              Your Flash Loan strategies are not running. To start scanning for arbitrage, please run the command <code className="bg-red-950/50 px-1.5 py-0.5 rounded text-red-300 font-mono">npm run bot</code> in your server terminal.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {strategies.length === 0 ? (
          <div className="col-span-full p-8 border border-dashed border-slate-700 rounded-xl text-center text-slate-500">
            No strategies configured. Add one below to start scanning for arbitrage.
          </div>
        ) : strategies.map(strat => (
          <div key={strat._id} className={clsx("bg-slate-900 border rounded-xl p-5 shadow-sm transition-colors", strat.active ? "border-emerald-500/50 shadow-emerald-500/10" : "border-slate-800 hover:border-slate-700")}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-lg font-bold text-white flex items-center gap-3">
                  {strat.name}
                  <button 
                    onClick={() => handleToggleActive(strat._id, strat.active)}
                    className={clsx(
                      "flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-colors hover:brightness-125", 
                      strat.active ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-slate-800 text-slate-400 border border-slate-700"
                    )}
                    title={strat.active ? "Pause Engine" : "Start Engine"}
                  >
                    {strat.active ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    {strat.active ? 'Running' : 'Paused'}
                  </button>
                </h4>
                <p className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-2">
                  <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-bold">{strat.tokenBSymbol || 'UNKNOWN'}</span>
                  {strat.tokenBMint.substring(0,6)}...{strat.tokenBMint.substring(strat.tokenBMint.length-6)}
                </p>
              </div>
              <button onClick={() => handleDelete(strat._id)} className="text-slate-600 hover:text-red-400 transition-colors p-1 bg-slate-800/50 rounded-md">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                <p className="text-xs text-slate-500 mb-1">Borrow Size</p>
                <p className="text-sm font-semibold text-emerald-400">${strat.borrowAmount.toLocaleString()} USDC</p>
              </div>
              <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                <p className="text-xs text-slate-500 mb-1">Provider</p>
                <p className="text-sm font-semibold text-indigo-400 capitalize">{strat.provider}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm max-w-2xl">
        <h4 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-500" /> Configure New Strategy
        </h4>
        <form onSubmit={handleAdd} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Strategy Name</label>
              <input required value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500" placeholder="e.g. USDC/SOL Arb" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Provider</label>
              <select value={provider} onChange={e => setProvider(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500 appearance-none">
                <option value="jupiter">Jupiter (Default)</option>
                <option value="raptor">Raptor API</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-slate-400 mb-1">Execution Wallet (Pays Fees & Receives Profit)</label>
            <select required value={selectedWalletId} onChange={e => setSelectedWalletId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500 appearance-none">
              {wallets.length === 0 ? <option value="">No wallets registered</option> : null}
              {wallets.map(w => (
                <option key={w._id} value={w._id}>{w.acronym} - {w.publicKey.substring(0,6)}...{w.publicKey.substring(w.publicKey.length-4)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Target Arbitrage Token</label>
            <select required value={tokenBMint} onChange={e => setTokenBMint(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500 appearance-none">
              {KNOWN_TOKENS.map(t => (
                <option key={t.mint} value={t.mint}>{t.symbol} ({t.mint.substring(0, 4)}...{t.mint.substring(t.mint.length - 4)})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Borrow Amount (USDC)</label>
              <input required type="number" value={borrowAmount} onChange={e => setBorrowAmount(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500 font-mono" placeholder="100" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Min. Profit (USDC)</label>
              <input required type="number" step="0.01" value={minProfitUsdc} onChange={e => setMinProfitUsdc(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500 font-mono" placeholder="0" />
            </div>
          </div>

          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mt-4">
            <Plus className="w-5 h-5" /> Deploy Strategy
          </button>
        </form>
      </div>
    </div>
  );
}
