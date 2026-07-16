import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import Wallet from '@/models/Wallet';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { decryptSecretKey } from '@/lib/encryption';

export const GET = withAuth(async (req: NextRequest, userId: string) => {
  try {
    await connectToDatabase();
    
    const url = new URL(req.url);
    const publicKey = url.searchParams.get('publicKey');

    if (!publicKey) {
      return NextResponse.json({ error: 'publicKey is required' }, { status: 400 });
    }

    // Buscar a carteira do usuário no banco de dados para pegar a secretKey criptografada
    const wallet = await Wallet.findOne({ userId, publicKey });
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    // Descriptografar a chave privada
    let decryptedSecret: string;
    try {
      decryptedSecret = decryptSecretKey(wallet.secretKey, wallet.publicKey);
    } catch (e) {
      console.error("Decryption error", e);
      return NextResponse.json({ error: 'Could not decrypt wallet' }, { status: 500 });
    }

    // Criar o Keypair da Solana usando a biblioteca oficial
    let keypair: Keypair;
    try {
      // Tentar ler como Base58 (Phantom export format)
      const secretKeyBytes = bs58.decode(decryptedSecret);
      keypair = Keypair.fromSecretKey(secretKeyBytes);
    } catch (e) {
      try {
        // Fallback para ler como array JSON (CLI format)
        const secretKeyBytes = Uint8Array.from(JSON.parse(decryptedSecret));
        keypair = Keypair.fromSecretKey(secretKeyBytes);
      } catch (err) {
        return NextResponse.json({ error: 'Invalid secret key format' }, { status: 400 });
      }
    }

    // Conectar à Solana e buscar saldos
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    
    // Buscar saldo nativo (SOL)
    const lamports = await connection.getBalance(keypair.publicKey);
    const balanceSol = lamports / 1e9;

    // Buscar todos os tokens SPL (ATAs) do usuário
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      keypair.publicKey,
      { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') } // TOKEN_PROGRAM_ID
    );

    const KNOWN_TOKENS: Record<string, string> = {
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
      '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': 'RAY',
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK'
    };

    const tokens: Array<{ symbol: string; mint: string; balance: number }> = [];

    tokenAccounts.value.forEach((accountInfo) => {
      const parsedInfo = accountInfo.account.data.parsed.info;
      const mintAddress = parsedInfo.mint;
      const tokenBalance = parsedInfo.tokenAmount.uiAmount;

      if (tokenBalance > 0) {
        tokens.push({
          symbol: KNOWN_TOKENS[mintAddress] || 'Unknown',
          mint: mintAddress,
          balance: tokenBalance
        });
      }
    });

    return NextResponse.json({ 
      publicKey: keypair.publicKey.toBase58(), 
      balanceSol,
      tokens 
    });
  } catch (error: any) {
    console.error('Solana RPC Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
