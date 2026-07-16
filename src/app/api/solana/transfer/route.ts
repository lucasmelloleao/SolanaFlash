import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import Wallet from '@/models/Wallet';
import TransactionLog from '@/models/Transaction';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { decryptSecretKey } from '@/lib/encryption';

export const POST = withAuth(async (req: NextRequest, userId: string) => {
  try {
    await connectToDatabase();
    
    const { walletId, toAddress, amount } = await req.json();

    if (!walletId || !toAddress || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
    }

    // 1. Validar endereço de destino
    let toPubkey: PublicKey;
    try {
      toPubkey = new PublicKey(toAddress);
      if (!PublicKey.isOnCurve(toPubkey.toBytes())) {
        throw new Error('Off curve');
      }
    } catch (e) {
      return NextResponse.json({ error: 'Invalid destination address' }, { status: 400 });
    }

    // 2. Buscar a carteira do usuário (remetente)
    const wallet = await Wallet.findOne({ _id: walletId, userId });
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    // 3. Descriptografar a chave privada
    let decryptedSecret: string;
    try {
      decryptedSecret = decryptSecretKey(wallet.secretKey, wallet.publicKey);
    } catch (e) {
      console.error("Decryption error", e);
      return NextResponse.json({ error: 'Could not decrypt wallet' }, { status: 500 });
    }

    // 4. Instanciar o Keypair
    let keypair: Keypair;
    try {
      const secretKeyBytes = bs58.decode(decryptedSecret);
      keypair = Keypair.fromSecretKey(secretKeyBytes);
    } catch (e) {
      try {
        const secretKeyBytes = Uint8Array.from(JSON.parse(decryptedSecret));
        keypair = Keypair.fromSecretKey(secretKeyBytes);
      } catch (err) {
        return NextResponse.json({ error: 'Invalid secret key format in DB' }, { status: 500 });
      }
    }

    // 5. Conectar e montar a transação (SOL)
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    const lamports = Math.floor(amount * 1e9);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: toPubkey,
        lamports,
      })
    );

    // 6. Assinar e enviar a transação
    // Para simplificar e evitar travar o request por muito tempo,
    // usremos sendTransaction com commitment finalizado ou 'confirmed'
    
    // Obter o blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = keypair.publicKey;

    // Assinar
    transaction.sign(keypair);

    // Enviar para rede
    const txid = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });

    // 7. Salvar histórico no banco
    const txLog = await TransactionLog.create({
      userId,
      walletId,
      fromPublicKey: keypair.publicKey.toBase58(),
      toPublicKey: toPubkey.toBase58(),
      amount,
      asset: 'SOL',
      txid,
      status: 'pending', // Ficará pending até a rede confirmar totalmente, mas para UX podemos considerar sucesso inicial.
      networkFee: 0.000005 // Taxa base estimada da Solana
    });

    return NextResponse.json({ 
      success: true, 
      txid,
      message: 'Transfer submitted successfully!',
      logId: txLog._id
    }, { status: 200 });

  } catch (error: any) {
    console.error('Transfer Error:', error);
    return NextResponse.json({ error: error.message || 'Transfer failed' }, { status: 500 });
  }
});
