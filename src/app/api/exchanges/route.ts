import { NextRequest, NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import ExchangeKey from '@/models/ExchangeKey';
import { withAuth } from '@/lib/auth';
import { encryptSecretKey } from '@/lib/encryption';

export const GET = withAuth(async (req: NextRequest, userId: string) => {
    try {
        await connectMongo();
        
        const exchanges = await ExchangeKey.find({ userId }).select('-apiSecret').sort({ createdAt: -1 });
        return NextResponse.json({ success: true, exchanges });
    } catch (e: any) {
        return NextResponse.json({ success: false, reason: e.message }, { status: 500 });
    }
});

export const POST = withAuth(async (req: NextRequest, userId: string) => {
    try {
        await connectMongo();
        const body = await req.json();
        
        const { exchangeId, name, apiKey, apiSecret } = body;

        if (!exchangeId || !name || !apiKey || !apiSecret) {
            return NextResponse.json({ success: false, reason: 'Missing required fields' }, { status: 400 });
        }

        const authContext = `${userId}-${exchangeId}`;
        const encryptedSecret = encryptSecretKey(apiSecret, authContext);

        const exchangeKey = new ExchangeKey({
            userId,
            exchangeId,
            name,
            apiKey,
            apiSecret: encryptedSecret,
            active: true
        });

        await exchangeKey.save();

        const responseData = exchangeKey.toObject();
        delete responseData.apiSecret;

        return NextResponse.json({ success: true, exchange: responseData }, { status: 201 });
    } catch (e: any) {
        return NextResponse.json({ success: false, reason: e.message }, { status: 500 });
    }
});

export const DELETE = withAuth(async (req: NextRequest, userId: string) => {
    try {
        const url = new URL(req.url);
        const id = url.searchParams.get('id');
        if (!id) return NextResponse.json({ success: false, reason: 'ID is required' }, { status: 400 });

        await connectMongo();
        const deleted = await ExchangeKey.findOneAndDelete({ _id: id, userId });
        
        if (!deleted) return NextResponse.json({ success: false, reason: 'Not found or unauthorized' }, { status: 404 });
        
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, reason: e.message }, { status: 500 });
    }
});
