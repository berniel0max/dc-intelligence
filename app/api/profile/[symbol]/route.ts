import { NextRequest, NextResponse } from 'next/server';
import { fetchProfile } from '@/src/lib/fmp';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params;
  try {
    const profile = await fetchProfile(symbol.toUpperCase());
    if (!profile) return NextResponse.json({ description: '' });

    // Trim description to ~200 chars at a sentence boundary for card display
    let desc = profile.description ?? '';
    if (desc.length > 220) {
      const cut = desc.lastIndexOf('.', 220);
      desc = cut > 80 ? desc.slice(0, cut + 1) : desc.slice(0, 220).trimEnd() + '…';
    }
    return NextResponse.json({ name: profile.name, description: desc });
  } catch {
    return NextResponse.json({ description: '' });
  }
}
