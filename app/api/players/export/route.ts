import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// /api/players/export?auctionId=...
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const auctionId = searchParams.get('auctionId');

  if (!auctionId) {
    return NextResponse.json({ success: false, error: 'Auction ID is required' }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Only allow auction creator to export
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    select: { createdById: true },
  });
  if (!auction || auction.createdById !== session.user.id) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  // Fetch all players for this auction
  const players = await prisma.player.findMany({
    where: { auctionId },
    select: {
      name: true,
      description: true,
      role: true,
      basePrice: true,
      marqueeSet: true,
      avatarUrl: true,
      previousTeamShortName: true,
      status: true,
      team: { select: { shortName: true } },
    },
    orderBy: [{ auctionOrder: 'asc' }, { createdAt: 'asc' }],
  });

  // Format for export
  const exportList = players.map((p) => ({
    name: p.name,
    description: p.description,
    role: p.role,
    basePrice: p.basePrice,
    marqueeSet: p.marqueeSet,
    previousTeamShortName:
      p.status === 'SOLD' && p.team?.shortName ? p.team.shortName : 'none',
    avatarUrl: p.avatarUrl,
  }));

  return new NextResponse(JSON.stringify(exportList, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="players_export.json"',
    },
  });
}
