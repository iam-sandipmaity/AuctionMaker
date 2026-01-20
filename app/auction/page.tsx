import { getAuctions } from '@/lib/db/auctions';
import AuctionCard from '@/components/auction/AuctionCard';
import { AuctionStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function AuctionPage() {
    const auctions = await getAuctions();

    const liveAuctions = auctions.filter(a => a.status === AuctionStatus.LIVE);
    const upcomingAuctions = auctions.filter(a => a.status === AuctionStatus.UPCOMING);
    const endedAuctions = auctions.filter(a => a.status === AuctionStatus.ENDED);

    return (
        <div className="container section">
            <div className="mb-12">
                <h1 className="mb-4">AUCTION HUB</h1>
                <p className="text-xl font-mono text-muted">
                    Browse and join live auctions. Place bids. Win items.
                </p>
            </div>

            {/* Live Auctions */}
            {liveAuctions.length > 0 && (
                <section className="mb-16">
                    <div className="flex items-center gap-4 mb-8">
                        <h2>LIVE AUCTIONS</h2>
                        <div className="h-3 w-3 bg-accent rounded-full animate-pulse"></div>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {liveAuctions.map((auction) => (
                            <AuctionCard key={auction.id} auction={auction} />
                        ))}
                    </div>
                </section>
            )}

            {/* Upcoming Auctions */}
            {upcomingAuctions.length > 0 && (
                <section className="mb-16 border-t-3 border-border pt-16">
                    <h2 className="mb-8">UPCOMING AUCTIONS</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {upcomingAuctions.map((auction) => (
                            <AuctionCard key={auction.id} auction={auction} />
                        ))}
                    </div>
                </section>
            )}

            {/* Ended Auctions */}
            {endedAuctions.length > 0 && (
                <section className="mb-16 border-t-3 border-border pt-16">
                    <h2 className="mb-8">COMPLETED AUCTIONS</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {endedAuctions.map((auction) => (
                            <AuctionCard key={auction.id} auction={auction} />
                        ))}
                    </div>
                </section>
            )}

            {auctions.length === 0 && (
                <div className="text-center py-20">
                    <p className="text-2xl font-mono text-muted">
                        No auctions available yet. Check back soon!
                    </p>
                </div>
            )}
        </div>
    );
}
