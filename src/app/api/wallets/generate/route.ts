import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Wallet from '@/models/Wallet';
import { withAuth } from '@/lib/auth';
import { encryptSecretKey } from '@/lib/encryption';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

export const POST = withAuth(async (req: NextRequest, userId: string) => {
  try {
    await connectToDatabase();
    const { acronym } = await req.json();

    if (!acronym) {
      return NextResponse.json({ error: 'Acronym is required' }, { status: 400 });
    }

    // 1. Generate mnemonic
    const mnemonic = bip39.generateMnemonic(128); // 12 words
    const seed = bip39.mnemonicToSeedSync(mnemonic);

    // 2. Derive Solana keypair path: m/44'/501'/0'/0'
    const path = "m/44'/501'/0'/0'";
    const derivedSeed = derivePath(path, seed.toString('hex')).key;
    const keypair = Keypair.fromSeed(derivedSeed);

    const publicKey = keypair.publicKey.toBase58();
    const secretKey = bs58.encode(keypair.secretKey); // Export as Base58

    // 3. Encrypt the secret key securely
    const encryptedSecretKey = encryptSecretKey(secretKey, publicKey);

    // 4. Save to database
    const wallet = await Wallet.create({ userId, acronym, publicKey, secretKey: encryptedSecretKey });

    // 5. Return success and the mnemonic (ONLY SHOWN ONCE!)
    return NextResponse.json({ 
      id: wallet._id, 
      acronym, 
      publicKey,
      mnemonic // Pass mnemonic back to UI so user can save it
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
