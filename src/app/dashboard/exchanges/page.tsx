'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Key, Link as LinkIcon } from 'lucide-react';
import clsx from 'clsx';

const SUPPORTED_EXCHANGES = [
  { id: 'mexc', name: 'MEXC' },
  { id: 'binance', name: 'Binance' },
  { id: 'okx', name: 'OKX' },
  { id: 'bybit', name: 'Bybit' },
  { id: 'gateio', name: 'Gate.io' }
];

type ExchangeKey = {
  _id: string;
  exchangeId: string;
  name: string;
  apiKey: string;
  active: boolean;
  createdAt: string;
};

export default function ExchangesPage() {
  const [exchanges, setExchanges] = useState<ExchangeKey[]>([]);
  const [exchangeId, setExchangeId] = useState(SUPPORTED_EXCHANGES[0].id);
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchExchanges = async () => {
    try {
      const res = await fetch('/api/exchanges', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setExchanges(data.exchanges || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { 
    fetchExchanges(); 
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/exchanges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ 
          exchangeId, 
          name, 
          apiKey, 
          apiSecret 
        })
      });
      if (res.ok) {
        setExchangeId(SUPPORTED_EXCHANGES[0].id);
        setName('');
        setApiKey('');
        setApiSecret('');
        fetchExchanges();
      } else {
        const err = await res.json();
        alert(err.reason || 'Failed to add exchange key');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API Key?')) return;
    try {
      const res = await fetch(`/api/exchanges?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) fetchExchanges();
    } catch (e) {
      console.error(e);
    }
  };

  const getExchangeName = (id: string) => {
    return SUPPORTED_EXCHANGES.find(e => e.id === id)?.name || id;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-white">Corretoras Centralizadas (CEX)</h3>
      </div>

      <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-4 flex items-start gap-4 shadow-sm mb-8">
        <LinkIcon className="w-6 h-6 text-sky-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sky-400 font-bold mb-1">Gerenciamento de API Keys</h4>
          <p className="text-sky-200/80 text-sm">
            Registre as suas chaves de API aqui para permitir que o bot execute transações via CCXT nas corretoras centralizadas. Os seus "API Secrets" são criptografados com segurança no banco de dados.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {exchanges.length === 0 ? (
          <div className="col-span-full p-8 border border-dashed border-slate-700 rounded-xl text-center text-slate-500">
            Nenhuma corretora registrada. Adicione uma abaixo.
          </div>
        ) : exchanges.map(exchange => (
          <div key={exchange._id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-lg font-bold text-white flex items-center gap-3">
                  {exchange.name}
                  <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                    {getExchangeName(exchange.exchangeId)}
                  </span>
                </h4>
                <p className="text-xs text-slate-400 font-mono mt-2">
                  Chave: {exchange.apiKey.substring(0, 8)}...{exchange.apiKey.substring(exchange.apiKey.length - 4)}
                </p>
              </div>
              <button onClick={() => handleDelete(exchange._id)} className="text-slate-600 hover:text-red-400 transition-colors p-1 bg-slate-800/50 rounded-md">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800/50 flex justify-between items-center text-xs text-slate-500">
              <span>Adicionado: {new Date(exchange.createdAt).toLocaleDateString()}</span>
              <span className="text-emerald-400 flex items-center gap-1"><Key className="w-3 h-3" /> Segredo Criptografado</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm max-w-2xl">
        <h4 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
          <Plus className="w-5 h-5 text-indigo-500" /> Registrar Nova Chave de API
        </h4>
        <form onSubmit={handleAdd} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Corretora (Exchange)</label>
              <select required value={exchangeId} onChange={e => setExchangeId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500 appearance-none">
                {SUPPORTED_EXCHANGES.map(ex => (
                  <option key={ex.id} value={ex.id}>{ex.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Nome da Conexão</label>
              <input required value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500" placeholder="Ex: Minha Conta MEXC Scalper" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">API Key</label>
            <input required type="text" value={apiKey} onChange={e => setApiKey(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500 font-mono text-sm" placeholder="Cole sua API Key aqui" />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">API Secret</label>
            <input required type="password" value={apiSecret} onChange={e => setApiSecret(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500 font-mono text-sm" placeholder="Cole seu API Secret aqui" />
            <p className="text-xs text-slate-500 mt-1">Isso será criptografado via AES-256-GCM antes de ser salvo no banco.</p>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mt-4">
            {loading ? 'Registrando...' : 'Registrar Chaves da API'}
          </button>
        </form>
      </div>
    </div>
  );
}
