import { NextRequest, NextResponse } from 'next/server';
import { getTrendingGifs, searchGifs } from '@/lib/klipyClient';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'trending';
    const query = searchParams.get('q') || '';
    const limit = Math.min(Number(searchParams.get('limit')) || 24, 48);
    const page = Math.max(Number(searchParams.get('page')) || 1, 1);

    if (type === 'search' && query.trim()) {
      const result = await searchGifs(query.trim(), limit, page);
      return NextResponse.json(result);
    }

    const result = await getTrendingGifs(limit, page);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API /api/klipy error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch GIFs from Klipy', gifs: [], hasNext: false, page: 1 },
      { status: 500 }
    );
  }
}
