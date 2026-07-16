import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import SystemStatus from '@/models/SystemStatus';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (req: NextRequest, userId: string) => {
  try {
    await connectToDatabase();
    const status = await SystemStatus.findOne({ id: 'global' });
    
    let botOnline = false;
    if (status && status.botLastHeartbeat) {
      const now = new Date().getTime();
      const lastHeartbeat = new Date(status.botLastHeartbeat).getTime();
      
      // Se o último pulso foi há menos de 15 segundos, está online
      if (now - lastHeartbeat < 15000) {
        botOnline = true;
      }
    }

    return NextResponse.json({ 
      botOnline, 
      lastHeartbeat: status?.botLastHeartbeat,
      botMode: status?.botMode || 'simulated'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const PUT = withAuth(async (req: NextRequest, userId: string) => {
  try {
    await connectToDatabase();
    const { botMode } = await req.json();

    if (botMode !== 'simulated' && botMode !== 'live') {
      return NextResponse.json({ error: 'Invalid botMode' }, { status: 400 });
    }

    const status = await SystemStatus.findOneAndUpdate(
      { id: 'global' },
      { botMode },
      { upsert: true, new: true }
    );
    
    return NextResponse.json({ botMode: status.botMode });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
