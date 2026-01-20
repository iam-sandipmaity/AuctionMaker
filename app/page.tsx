import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function Home() {
    return (
        <div className="container">
            {/* Hero Section */}
            <section className="section min-h-[80vh] flex flex-col justify-center items-center text-center">
                <h1 className="mb-6">
                    REAL-TIME
                    <br />
                    <span className="text-accent">AUCTION</span>
                    <br />
                    PLATFORM
                </h1>
                <p className="text-xl md:text-2xl max-w-3xl mb-12 text-muted font-mono">
                    Experience the thrill of live bidding. Compete with real users in real-time.
                    Manage your budget. Win exclusive items.
                </p>
                <Link href="/auction">
                    <Button variant="primary" className="text-xl px-12 py-6">
                        ENTER AUCTIONS →
                    </Button>
                </Link>
            </section>

            {/* Features Section */}
            <section className="section py-20 border-t-3 border-border">
                <h2 className="text-center mb-16">HOW IT WORKS</h2>

                <div className="grid md:grid-cols-3 gap-8">
                    <div className="card p-8">
                        <div className="font-mono text-accent text-6xl font-bold mb-4">01</div>
                        <h3 className="mb-4">CREATE ACCOUNT</h3>
                        <p className="text-muted font-mono">
                            Register and receive your starting wallet balance. Manage your budget across multiple auctions.
                        </p>
                    </div>

                    <div className="card p-8">
                        <div className="font-mono text-accent text-6xl font-bold mb-4">02</div>
                        <h3 className="mb-4">JOIN AUCTIONS</h3>
                        <p className="text-muted font-mono">
                            Browse live, upcoming, and completed auctions. Enter rooms and compete with other bidders in real-time.
                        </p>
                    </div>

                    <div className="card p-8">
                        <div className="font-mono text-accent text-6xl font-bold mb-4">03</div>
                        <h3 className="mb-4">PLACE BIDS</h3>
                        <p className="text-muted font-mono">
                            Submit bids instantly. Watch live updates. Outbid competitors. Win items when the timer expires.
                        </p>
                    </div>
                </div>
            </section>

            {/* Features List */}
            <section className="section py-20 border-t-3 border-border">
                <div className="max-w-4xl mx-auto">
                    <h2 className="mb-12">FEATURES</h2>

                    <div className="space-y-6">
                        {[
                            'Real-time bidding with WebSocket technology',
                            'Live activity feed showing all bids',
                            'Budget management and wallet system',
                            'Countdown timers with auto-close',
                            'Multi-user support with concurrent bidding',
                            'Admin dashboard for auction creation',
                            'Mobile-responsive brutalist design',
                            'Secure authentication and session management',
                        ].map((feature, index) => (
                            <div key={index} className="flex items-start gap-4 border-l-5 border-accent pl-6 py-2">
                                <span className="font-mono text-accent font-bold">▸</span>
                                <span className="font-mono text-lg">{feature}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="section py-20 border-t-3 border-border text-center">
                <h2 className="mb-8">READY TO START BIDDING?</h2>
                <div className="flex gap-4 justify-center">
                    <Link href="/register">
                        <Button variant="primary" className="text-xl px-12 py-6">
                            REGISTER NOW
                        </Button>
                    </Link>
                    <Link href="/auction">
                        <Button variant="secondary" className="text-xl px-12 py-6">
                            VIEW AUCTIONS
                        </Button>
                    </Link>
                </div>
            </section>
        </div>
    );
}
