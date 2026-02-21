import { NextResponse } from 'next/server';
import { networkInterfaces } from 'os';

function getLocalIp(): string | null {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}

export async function GET() {
  const localIp = getLocalIp();
  const port = process.env.PORT || '3000';
  
  const localUrl = localIp ? `http://${localIp}:${port}` : `http://localhost:${port}`;
  
  const vercelUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : null;
  
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const publicUrl = appUrl && appUrl !== 'http://localhost:3000' 
    ? appUrl 
    : vercelUrl;

  return NextResponse.json({
    local: localUrl,
    localIp,
    public: publicUrl,
    vercel: vercelUrl,
    primary: publicUrl || localUrl,
  });
}
