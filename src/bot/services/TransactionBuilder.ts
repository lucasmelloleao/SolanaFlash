import {
    Keypair,
    PublicKey,
    TransactionInstruction,
    ComputeBudgetProgram,
    SystemProgram,
    TransactionMessage,
    VersionedTransaction,
    AddressLookupTableAccount
} from '@solana/web3.js';
import bs58 from 'bs58';
import { createFlashLoanBorrowInstruction, createFlashLoanRepayInstruction } from '../solend-helper';
import { SolanaService } from './SolanaService';
import { SolendPoolConfig } from '../config/solend-pools';

const JITO_TIP_ACCOUNTS = [
    '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
    'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
    'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvVkY',
    'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
    'DfXygSm4jMoQAqhSqSyCWEHjoEQq8WkK3WNDPWh9F8p8',
    'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwLcWE',
    'DttWaMuVvTiduZZ1vWHcNEvzePpfndZ5XQ7hG2k2Q5T2',
    '3AVi9Tg9Uo68tJfuvoKvYEGcGXH227G43FhX9p98iP3C'
];

function deserializeInstruction(instruction: any) {
    if (!instruction) return null;
    return new TransactionInstruction({
        programId: new PublicKey(instruction.programId),
        keys: instruction.accounts.map((key: any) => ({
            pubkey: new PublicKey(key.pubkey),
            isSigner: key.isSigner,
            isWritable: key.isWritable,
        })),
        data: Buffer.from(instruction.data, 'base64'),
    });
}

export class TransactionBuilder {
    static async buildAndSendArbitrage(
        walletKeypair: Keypair,
        borrowAmount: number,
        flashLoanFee: number,
        jitoTipLamports: number,
        instructionsARes: any,
        instructionsBRes: any,
        cachedUserAta: PublicKey,
        poolConfig: SolendPoolConfig
    ): Promise<{ txid: string, jitoBundleId: string | null } | null> {
        
        const swapA = {
            setupInstructions: (instructionsARes.setupInstructions || []).map(deserializeInstruction),
            swapInstruction: deserializeInstruction(instructionsARes.swapInstruction),
            cleanupInstruction: deserializeInstruction(instructionsARes.cleanupInstruction),
            addressLookupTableAddresses: instructionsARes.addressLookupTableAddresses || []
        };

        const swapB = {
            setupInstructions: (instructionsBRes.setupInstructions || []).map(deserializeInstruction),
            swapInstruction: deserializeInstruction(instructionsBRes.swapInstruction),
            cleanupInstruction: deserializeInstruction(instructionsBRes.cleanupInstruction),
            addressLookupTableAddresses: instructionsBRes.addressLookupTableAddresses || []
        };

        const lutAddresses = [...new Set([...swapA.addressLookupTableAddresses, ...swapB.addressLookupTableAddresses])];
        const lookupTableAccounts = await SolanaService.resolveLookupTables(lutAddresses as string[]);

        const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({ units: 500000 });
        const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 40000 });
        const randomTipAccount = new PublicKey(JITO_TIP_ACCOUNTS[Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length)]);
        const jitoTipIx = SystemProgram.transfer({ fromPubkey: walletKeypair.publicKey, toPubkey: randomTipAccount, lamports: jitoTipLamports });

        const borrowIx = createFlashLoanBorrowInstruction(borrowAmount, cachedUserAta, poolConfig);
        const preRepayIxs = [
            modifyComputeUnits, addPriorityFee, borrowIx,
            ...swapA.setupInstructions, swapA.swapInstruction, swapA.cleanupInstruction,
            swapB.swapInstruction, swapB.cleanupInstruction,
        ].filter(Boolean);

        const borrowIxIndex = preRepayIxs.indexOf(borrowIx);
        const repayAmount = borrowAmount + flashLoanFee;
        const repayIx = createFlashLoanRepayInstruction(repayAmount, borrowIxIndex, cachedUserAta, walletKeypair.publicKey, poolConfig);

        const allIxs = [...preRepayIxs, repayIx, jitoTipIx];
        
        const connection = await SolanaService.getConnection();
        const { blockhash } = await connection.getLatestBlockhash('confirmed');

        const messageV0 = new TransactionMessage({
            payerKey: walletKeypair.publicKey,
            recentBlockhash: blockhash,
            instructions: allIxs as TransactionInstruction[]
        }).compileToV0Message(lookupTableAccounts);

        const transaction = new VersionedTransaction(messageV0);
        transaction.sign([walletKeypair]);
        const transactionBase58 = bs58.encode(transaction.serialize());
        const txid = bs58.encode(transaction.signatures[0]);

        const jitoResponse = await SolanaService.sendJitoBundle(transactionBase58);
        return { 
            txid, 
            jitoBundleId: (jitoResponse && jitoResponse.result) ? jitoResponse.result : null 
        };
    }
}
