import { getAuctions } from '@/lib/db/auctions';
import AuctionCard from '@/components/auction/AuctionCard';
import { AuctionStatus } from '@prisma/client';

// Revalidate every 60 seconds for auction listings
export const revalidate = 60;

export default async function AuctionPage() {
    const auctions = await getAuctions();

    const liveAuctions = auctions.filter(a => a.status === AuctionStatus.LIVE);
    const upcomingAuctions = auctions.filter(a => a.status === AuctionStatus.UPCOMING);
    const endedAuctions = auctions.filter(a => a.status === AuctionStatus.ENDED);

    return (
        <div className="container section">
            <div className="mb-8 md:mb-10 lg:mb-12 px-4 lg:px-0">
                <h1 className="mb-4">AUCTION HUB</h1>
                <p className="text-base md:text-lg lg:text-xl font-mono text-muted">
                    Browse and join live auctions. Place bids. Win items.
                </p>
            </div>

            {/* Live Auctions */}
            {liveAuctions.length > 0 && (
                <section className="mb-10 md:mb-12 lg:mb-16 px-4 lg:px-0">
                    <div className="flex items-center gap-4 mb-6 md:mb-7 lg:mb-8">
                        <h2>LIVE AUCTIONS</h2>
                        <div className="h-3 w-3 bg-accent rounded-full animate-pulse"></div>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-5 lg:gap-6">
                        {liveAuctions.map((auction) => (
                            <AuctionCard key={auction.id} auction={auction} />
                        ))}
                    </div>
                </section>
            )}

            {/* Upcoming Auctions */}
            {upcomingAuctions.length > 0 && (
                <section className="mb-10 md:mb-12 lg:mb-16 border-t-3 border-border pt-10 md:pt-12 lg:pt-16 px-4 lg:px-0">
                    <h2 className="mb-6 md:mb-7 lg:mb-8">UPCOMING AUCTIONS</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-5 lg:gap-6">
                        {upcomingAuctions.map((auction) => (
                            <AuctionCard key={auction.id} auction={auction} />
                        ))}
                    </div>
                </section>
            )}

            {/* Ended Auctions */}
            {endedAuctions.length > 0 && (
                <section className="mb-10 md:mb-12 lg:mb-16 border-t-3 border-border pt-10 md:pt-12 lg:pt-16 px-4 lg:px-0">
                    <h2 className="mb-6 md:mb-7 lg:mb-8">COMPLETED AUCTIONS</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-5 lg:gap-6">
                        {endedAuctions.map((auction) => (
                            <AuctionCard key={auction.id} auction={auction} />
                        ))}
                    </div>
                </section>
            )}

            {auctions.length === 0 && (
                <div className="text-center py-12 md:py-16 lg:py-20 px-4">
                    <p className="text-lg md:text-xl lg:text-2xl font-mono text-muted">
                        No auctions available yet. Check back soon!
                    </p>
                </div>
            )}
        </div>
    );
}
