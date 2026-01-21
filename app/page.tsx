import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function Home() {
    return (
        <div className="container">
            {/* Hero Section */}
            <section className="section min-h-[80vh] flex flex-col justify-center items-center text-center px-4 md:px-6 lg:px-4">
                <h1 className="mb-6 px-2">
                    REAL-TIME
                    <br />
                    <span className="text-accent">AUCTION</span>
                    <br />
                    PLATFORM
                </h1>
                <p className="text-lg md:text-xl lg:text-2xl max-w-3xl mb-8 md:mb-10 lg:mb-12 text-muted font-mono px-4">
                    Host IPL-style team auctions OR standard product auctions. Real-time bidding.
                    WebSocket updates. Complete control. Multiple concurrent participants.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 mb-6 md:mb-7 lg:mb-8 w-full sm:w-auto px-4">
                    <Link href="/auction" className="w-full sm:w-auto">
                        <Button variant="primary" className="text-lg md:text-xl px-8 md:px-10 lg:px-12 py-4 md:py-5 lg:py-6 w-full sm:w-auto">
                            ENTER AUCTIONS →
                        </Button>
                    </Link>
                </div>
                <p className="font-mono text-xs md:text-sm text-muted max-w-2xl px-4">
                    Perfect for cricket leagues, fantasy tournaments, corporate events, product sales, charity fundraisers, or any auction scenario
                </p>
            </section>

            {/* Auction Types Section */}
            <section className="section py-12 md:py-16 lg:py-20 border-t-3 border-border">
                <h2 className="text-center mb-8 md:mb-12 lg:mb-16 px-4">TWO AUCTION MODES</h2>

                <div className="grid md:grid-cols-2 gap-5 md:gap-6 lg:gap-8 mb-10 md:mb-12 lg:mb-16 px-4 lg:px-0">
                    <div className="card p-6 md:p-7 lg:p-8 border-accent">
                        <div className="font-mono text-accent text-2xl md:text-3xl lg:text-4xl font-bold mb-4">🏏 IPL-STYLE TEAM AUCTION</div>
                        <p className="text-muted font-mono mb-6">
                            Team-based player auction like IPL. Admin acts as auctioneer, multiple teams bid on players.
                        </p>
                        <ul className="space-y-3 font-mono text-sm">
                            <li>▸ Team budgets (e.g., 100 Crores per team)</li>
                            <li>▸ Squad size limits (Min: 11, Max: 15)</li>
                            <li>▸ Player roles & categories</li>
                            <li>▸ Real-time budget tracking</li>
                            <li>▸ Player shortlisting</li>
                        </ul>
                    </div>

                    <div className="card p-6 md:p-7 lg:p-8">
                        <div className="font-mono text-accent text-2xl md:text-3xl lg:text-4xl font-bold mb-4">🛍️ PRODUCT AUCTION</div>
                        <p className="text-muted font-mono mb-6">
                            Standard auction for products, items, or services. Traditional bidding with starting price and increments.
                        </p>
                        <ul className="space-y-3 font-mono text-sm">
                            <li>▸ Customizable starting price</li>
                            <li>▸ Set minimum bid increments</li>
                            <li>▸ Duration-based or manual close</li>
                            <li>▸ Unlimited participants</li>
                            <li>▸ Live bid updates</li>
                        </ul>
                    </div>
                </div>

                <h2 className="text-center mb-8 md:mb-12 lg:mb-16 mt-10 md:mt-16 lg:mt-20 px-4">HOW IT WORKS</h2>

                <div className="grid md:grid-cols-3 gap-5 md:gap-6 lg:gap-8 px-4 lg:px-0">
                    <div className="card p-6 md:p-7 lg:p-8">
                        <div className="font-mono text-accent text-6xl font-bold mb-4">01</div>
                        <h3 className="mb-4">CREATE AUCTION</h3>
                        <p className="text-muted font-mono">
                            Choose auction type. Set parameters (budgets, squad sizes, base prices, increments).
                            Add teams/items via UI or bulk import.
                        </p>
                    </div>

                    <div className="card p-6 md:p-7 lg:p-8">
                        <div className="font-mono text-accent text-6xl font-bold mb-4">02</div>
                        <h3 className="mb-4">JOIN & PREPARE</h3>
                        <p className="text-muted font-mono">
                            Participants join auction rooms. Teams can shortlist players of interest.
                            Everyone sees live updates as auction begins.
                        </p>
                    </div>

                    <div className="card p-6 md:p-7 lg:p-8">
                        <div className="font-mono text-accent text-6xl font-bold mb-4">03</div>
                        <h3 className="mb-4">LIVE BIDDING</h3>
                        <p className="text-muted font-mono">
                            Real-time bidding with instant updates. Track budgets, bid history, and activity feed.
                            Auctioneer controls flow with start/sold/unsold actions.
                        </p>
                    </div>
                </div>
            </section>

            {/* Features List */}
            <section className="section py-12 md:py-16 lg:py-20 border-t-3 border-border">
                <div className="max-w-4xl mx-auto px-4">
                    <h2 className="mb-8 md:mb-10 lg:mb-12">PLATFORM FEATURES</h2>

                    <div className="space-y-4 md:space-y-5 lg:space-y-6">
                        {[
                            { title: 'Dual Auction Modes', desc: 'IPL-style team auctions OR standard product auctions - choose what fits your needs' },
                            { title: 'Real-time WebSocket Updates', desc: 'Instant bid updates across all connected participants with zero refresh needed' },
                            { title: 'Budget & Squad Tracking', desc: 'Live team budgets, squad sizes, and spending analytics (Team Auctions)' },
                            { title: 'Bid History & Activity Feed', desc: 'Complete bidding history with timestamps and live activity log' },
                            { title: 'Auctioneer Control Panel', desc: 'Full auction management - start bidding, mark sold/unsold, control flow' },
                            { title: 'Bulk Import System', desc: 'Import teams, players, or items via Excel/CSV for rapid setup' },
                            { title: 'Multi-device Support', desc: 'Responsive design works perfectly on desktop, tablet, and mobile' },
                            { title: 'Role-based Access Control', desc: 'Admin, auctioneer, team member, and participant roles with granular permissions' },
                        ].map((feature, index) => (
                            <div key={index} className="flex items-start gap-3 md:gap-4 border-l-3 md:border-l-5 border-accent pl-4 md:pl-6 py-2">
                                <span className="font-mono text-accent font-bold text-sm md:text-base">▸</span>
                                <div className="flex flex-col">
                                    <span className="font-mono text-base md:text-lg font-bold">{feature.title}</span>
                                    <span className="font-mono text-xs md:text-sm text-muted">{feature.desc}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="section py-12 md:py-16 lg:py-20 border-t-3 border-border text-center px-4">
                <h2 className="mb-6 md:mb-7 lg:mb-8">READY TO START BIDDING?</h2>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/register" className="w-full sm:w-auto">
                        <Button variant="primary" className="text-lg md:text-xl px-8 md:px-10 lg:px-12 py-4 md:py-5 lg:py-6 w-full sm:w-auto">
                            REGISTER NOW
                        </Button>
                    </Link>
                    <Link href="/auction" className="w-full sm:w-auto">
                        <Button variant="secondary" className="text-lg md:text-xl px-8 md:px-10 lg:px-12 py-4 md:py-5 lg:py-6 w-full sm:w-auto">
                            VIEW AUCTIONS
                        </Button>
                    </Link>
                </div>
            </section>
        </div>
    );
}
