'use client';

import { useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';

type UserType = 'admin' | 'participant' | 'spectator';

const guides = {
    admin: {
        title: 'ADMIN WORKFLOW',
        subtitle: 'Create and control live auctions',
        badge: 'AUCTIONEER',
        steps: [
            {
                number: '01',
                title: 'Create New Auction',
                description: 'Navigate to /admin and fill the auction creation form',
                details: [
                    'Enter auction title and description',
                    'Choose auction type: PRODUCT or TEAM (IPL-style)',
                    'Set starting price and minimum bid increment',
                    'Configure currency and denomination (Million, Crore, etc.)',
                    'For TEAM auctions: Set team budget, min/max squad size',
                    'System creates auction in UPCOMING status',
                ],
                code: 'Default team budget: 100 Million | Min squad: 11 | Max squad: 15'
            },
            {
                number: '02',
                title: 'Setup Teams & Players',
                description: 'After creating auction, you\'ll be redirected to auction room',
                details: [
                    'Switch to "TEAMS" tab to add competing teams',
                    'Create teams with name, short name, and color',
                    'Switch to "PLAYERS" tab to add player pool',
                    'Set player roles: BATSMAN, BOWLER, ALL_ROUNDER, WICKET_KEEPER',
                    'Assign base prices for each player',
                    'All participants will see this data once auction starts',
                ],
                code: 'Teams tab → Add Team | Players tab → Add Player with role & base price'
            },
            {
                number: '03',
                title: 'Start Auction as Auctioneer',
                description: 'Use the Auctioneer Control Panel to manage live bidding',
                details: [
                    'Change auction status from UPCOMING to LIVE',
                    'Select a player from unsold pool to auction',
                    'Player appears on all connected clients instantly via WebSocket',
                    'Watch real-time bids coming from all team owners',
                    'Bid panel shows current highest bid and bidding team',
                    'Teams can only bid within their remaining budget',
                ],
                code: 'Auctioneer Control → Select Player → Start Auction → Monitor Bids'
            },
            {
                number: '04',
                title: 'Manage Player Sales',
                description: 'Accept winning bids or mark players as unsold',
                details: [
                    'Click "SELL TO TEAM" button to accept highest bid',
                    'Player is assigned to that team, budget deducted automatically',
                    'Squad size increments for winning team',
                    'Or click "UNSOLD" if no satisfactory bids received',
                    'All changes broadcast live to all participants',
                    'Move to next player and repeat',
                ],
                code: 'SELL → Updates team budget & squad | UNSOLD → Player remains available'
            },
            {
                number: '05',
                title: 'Complete Auction',
                description: 'Finish auction when all players are sold or unsold',
                details: [
                    'Monitor team budgets and squad sizes in real-time',
                    'Ensure teams meet minimum squad requirements',
                    'Review activity feed for complete auction history',
                    'Change auction status to ENDED when complete',
                    'All data persists in database for future reference',
                ],
                code: 'Activity Feed → Full audit trail | Status → ENDED to finalize'
            },
        ],
    },
    participant: {
        title: 'PARTICIPANT WORKFLOW',
        subtitle: 'Join auctions and place competitive bids',
        badge: 'BIDDER',
        steps: [
            {
                number: '01',
                title: 'Browse Upcoming Auctions',
                description: 'Visit /auction to see all available auctions',
                details: [
                    'LIVE auctions: Currently in progress, accepting bids',
                    'UPCOMING auctions: Not started yet, can join teams',
                    'ENDED auctions: Completed, view final results',
                    'Click any auction card to enter auction room',
                ],
                code: '/auction → Shows live, upcoming, and completed auctions'
            },
            {
                number: '02',
                title: 'Select Your Team',
                description: 'Choose team before auction goes live (UPCOMING only)',
                details: [
                    'Only UPCOMING auctions allow team selection',
                    'View all available teams with budgets',
                    'Click "SELECT" button next to your preferred team',
                    'System assigns you to that team',
                    'You cannot change team once auction starts',
                    'Wait for admin to change status to LIVE',
                ],
                code: 'UPCOMING status required → Select team → Wait for LIVE status'
            },
            {
                number: '03',
                title: 'Place Real-Time Bids',
                description: 'Bid when auctioneer presents a player during LIVE auction',
                details: [
                    'Auctioneer selects player - appears on your screen instantly',
                    'Current bid and bidding team shown in real-time',
                    'Enter your bid amount in the input field',
                    'Bid must exceed current bid by minimum increment',
                    'System validates against your remaining budget',
                    'All participants see your bid instantly via WebSocket',
                ],
                code: 'Bid validation: Amount > Current Bid && Amount <= Team Budget'
            },
            {
                number: '04',
                title: 'Win Players for Your Team',
                description: 'Highest bidder wins when auctioneer accepts the bid',
                details: [
                    'Auctioneer clicks "SELL TO TEAM" for winning bid',
                    'Player assigned to your team automatically',
                    'Your team budget decreases by bid amount',
                    'Squad size increases by 1',
                    'Player card shows in your team roster',
                    'Continue bidding on remaining players',
                ],
                code: 'Win = Budget decrease + Squad size increase + Player added'
            },
            {
                number: '05',
                title: 'Build Complete Squad',
                description: 'Strategically bid to meet squad requirements',
                details: [
                    'Monitor your remaining budget throughout auction',
                    'Track your current squad size vs min/max limits',
                    'Balance spending between star players and budget picks',
                    'Ensure you meet minimum squad size before budget runs out',
                    'View final team composition when auction ends',
                ],
                code: 'Target: Squad size >= Min squad size | Budget managed wisely'
            },
        ],
    },
    spectator: {
        title: 'SPECTATOR MODE',
        subtitle: 'Watch live auctions without participating',
        badge: 'OBSERVER',
        steps: [
            {
                number: '01',
                title: 'Enter Live Auction',
                description: 'Only LIVE auctions support spectator viewing',
                details: [
                    'Navigate to /auction page',
                    'Click any auction card with "LIVE" status',
                    'You will enter auction room automatically',
                    'DO NOT select any team',
                    'You become a spectator by default if you don\'t join a team',
                ],
                code: 'Spectating = Entering LIVE auction WITHOUT selecting a team'
            },
            {
                number: '02',
                title: 'Watch Real-Time Bidding',
                description: 'View all auction activity without interference',
                details: [
                    'See current player being auctioned',
                    'Watch bids come in from all teams in real-time',
                    'View current highest bid and leading team',
                    'No bid input available - you cannot place bids',
                    'All updates happen live via WebSocket connection',
                ],
                code: 'Read-only mode → See all data, cannot interact'
            },
            {
                number: '03',
                title: 'Monitor Team Performance',
                description: 'Track budgets, spending, and squad building',
                details: [
                    'Switch to "TEAMS" tab to view all team stats',
                    'See remaining budget for each team',
                    'Track squad sizes as players get sold',
                    'View which players each team has acquired',
                    'Compare team strategies and spending patterns',
                ],
                code: 'Teams tab → Budget tracking | Squad composition | Spending analysis'
            },
            {
                number: '04',
                title: 'Review Activity Feed',
                description: 'Complete history of auction events',
                details: [
                    'Chronological feed of all bids placed',
                    'Player sale notifications with final prices',
                    'Unsold player announcements',
                    'Team-wise transaction history',
                    'Perfect for post-auction analysis',
                ],
                code: 'Activity Feed → Audit trail of entire auction'
            },
        ],
    },
};

// Reusable Guide Details Component
function GuideDetails({ 
    guide, 
    expandedStep, 
    setExpandedStep,
    selectedType 
}: { 
    guide: typeof guides.admin, 
    expandedStep: number | null, 
    setExpandedStep: (step: number | null) => void,
    selectedType: UserType | null
}) {
    return (
        <div className="container max-w-5xl">
            {/* Guide Header */}
            <div className="mb-8 md:mb-12 px-4">
                <div className="flex items-center justify-center gap-4 mb-4">
                    <div className="h-1 w-12 bg-accent"></div>
                    <div className="px-4 py-2 border-3 border-accent bg-accent/10 font-mono text-sm font-bold">
                        {guide.badge}
                    </div>
                    <div className="h-1 w-12 bg-accent"></div>
                </div>
                <h2 className="text-center mb-4 text-2xl md:text-3xl lg:text-4xl">{guide.title}</h2>
                <p className="text-lg md:text-xl lg:text-2xl font-mono text-accent text-center">
                    {guide.subtitle}
                </p>
            </div>

            {/* Steps */}
            <div className="space-y-6 md:space-y-8 px-4">
                {guide.steps.map((step, index) => (
                    <div
                        key={index}
                        className={`card transition-all relative overflow-hidden ${
                            expandedStep === index
                                ? 'border-accent border-5'
                                : 'border-border border-3'
                        }`}
                    >
                        {/* Decorative corner */}
                        {expandedStep === index && (
                            <div className="absolute top-0 left-0 w-0 h-0 border-t-[30px] border-t-accent border-r-[30px] border-r-transparent opacity-20"></div>
                        )}
                        
                        {/* Step Header */}
                        <button
                            onClick={() => setExpandedStep(expandedStep === index ? null : index)}
                            className="w-full p-6 md:p-8 text-left hover:bg-accent/5 transition-colors"
                        >
                            <div className="flex items-start gap-4 md:gap-6">
                                <div className="flex-shrink-0">
                                    <div className={`font-grotesk text-3xl md:text-4xl font-bold transition-colors ${
                                        expandedStep === index ? 'text-accent' : 'text-muted'
                                    }`}>
                                        {step.number}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-grotesk text-xl md:text-2xl font-bold mb-2">
                                        {step.title}
                                    </h3>
                                    <p className="font-mono text-sm md:text-base text-muted">
                                        {step.description}
                                    </p>
                                </div>
                                <div className="flex-shrink-0">
                                    <div
                                        className={`w-8 h-8 border-3 flex items-center justify-center transition-all ${
                                            expandedStep === index 
                                                ? 'border-accent text-accent rotate-180' 
                                                : 'border-border'
                                        }`}
                                    >
                                        ▼
                                    </div>
                                </div>
                            </div>
                        </button>

                        {/* Expanded Content */}
                        {expandedStep === index && (
                            <div className="px-6 md:px-8 pb-6 md:pb-8 border-t-3 border-accent">
                                <div className="pt-6 space-y-6">
                                    {/* Details List */}
                                    <div className="space-y-3">
                                        {step.details.map((detail, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-start gap-3 font-mono text-sm md:text-base group"
                                            >
                                                <span className="text-accent flex-shrink-0 mt-1 font-bold">▸</span>
                                                <span className="group-hover:text-accent transition-colors">{detail}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Code/Technical Info */}
                                    <div className="p-4 md:p-5 border-3 border-muted bg-background/50 font-mono text-xs md:text-sm">
                                        <div className="flex items-start gap-2">
                                            <span className="text-accent flex-shrink-0">$</span>
                                            <code className="text-accent">{step.code}</code>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* CTA Section */}
            <div className="mt-12 md:mt-16 text-center px-4">
                <div className="card p-8 md:p-10 border-accent relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 border-5 border-accent opacity-5"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 border-5 border-accent opacity-5"></div>
                    <div className="relative z-10">
                        <h3 className="font-grotesk text-2xl md:text-3xl font-bold mb-4">
                            START {selectedType === 'admin' ? 'CREATING' : selectedType === 'participant' ? 'BIDDING' : 'WATCHING'}
                        </h3>
                        <p className="font-mono text-base md:text-lg text-muted mb-6">
                            {selectedType === 'admin' && 'Navigate to /admin to create your first auction'}
                            {selectedType === 'participant' && 'Browse /auction to join and start bidding'}
                            {selectedType === 'spectator' && 'Enter any LIVE auction to watch without participating'}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            {selectedType === 'admin' && (
                                <Link href="/admin">
                                    <Button variant="primary" className="text-lg px-8 py-4 w-full sm:w-auto">
                                        GO TO ADMIN
                                    </Button>
                                </Link>
                            )}
                            {selectedType === 'participant' && (
                                <Link href="/auction">
                                    <Button variant="primary" className="text-lg px-8 py-4 w-full sm:w-auto">
                                        BROWSE AUCTIONS
                                    </Button>
                                </Link>
                            )}
                            {selectedType === 'spectator' && (
                                <Link href="/auction">
                                    <Button variant="primary" className="text-lg px-8 py-4 w-full sm:w-auto">
                                        FIND LIVE AUCTIONS
                                    </Button>
                                </Link>
                            )}
                            <Link href="/">
                                <Button variant="secondary" className="text-lg px-8 py-4 w-full sm:w-auto">
                                    BACK HOME
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function HowItWorksPage() {
    const [selectedType, setSelectedType] = useState<UserType | null>(null);
    const [expandedStep, setExpandedStep] = useState<number | null>(0);

    const currentGuide = selectedType ? guides[selectedType] : null;

    const handleTypeSelect = (type: UserType) => {
        if (selectedType === type) {
            // Toggle off if clicking the same type
            setSelectedType(null);
            setExpandedStep(null);
        } else {
            // Select new type
            setSelectedType(type);
            setExpandedStep(0);
        }
    };

    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <section className="section py-12 md:py-16 lg:py-20 border-b-3 border-border">
                <div className="container">
                    <div className="relative">
                        <div className="absolute -top-4 -left-4 w-24 h-24 border-5 border-accent opacity-20"></div>
                        <div className="absolute -bottom-4 -right-4 w-32 h-32 border-5 border-accent opacity-10"></div>
                        <h1 className="text-center mb-4 md:mb-6 relative z-10">
                            HOW IT <span className="text-accent">WORKS</span>
                        </h1>
                    </div>
                    <p className="text-center text-lg md:text-xl lg:text-2xl max-w-4xl mx-auto text-muted font-mono px-4">
                        Complete technical documentation. Real workflows. No fluff.
                    </p>
                </div>
            </section>

            {/* User Type Selection */}
            <section className="section py-8 md:py-12 border-b-3 border-border">
                <div className="container">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-6xl mx-auto px-4">
                        {/* Admin Card */}
                        <button
                            onClick={() => handleTypeSelect('admin')}
                            className={`card p-6 md:p-8 text-left transition-all group relative overflow-hidden ${
                                selectedType === 'admin' ? 'border-accent border-5' : 'border-border border-3 hover:border-accent'
                            }`}
                        >
                            <div className="absolute top-0 right-0 w-20 h-20 border-5 border-accent opacity-10 transform translate-x-10 -translate-y-10"></div>
                            <div className="relative z-10">
                                <div className={`inline-block px-3 py-1 border-3 mb-4 font-mono text-xs font-bold ${
                                    selectedType === 'admin' ? 'border-accent text-accent' : 'border-border'
                                }`}>
                                    AUCTIONEER
                                </div>
                                <h3 className="font-grotesk text-xl md:text-2xl font-bold mb-3">
                                    ADMIN
                                </h3>
                                <p className="font-mono text-sm md:text-base text-muted mb-4">
                                    Create auctions. Add teams & players. Control live bidding. Sell to highest bidders.
                                </p>
                                <div className="font-mono text-xs">
                                    <span className="text-accent">▸</span> /admin workflow
                                </div>
                            </div>
                        </button>

                        {/* Admin Details - Shows on mobile/tablet between admin and participant */}
                        {selectedType === 'admin' && (
                            <div className="md:hidden col-span-1">
                                <GuideDetails guide={guides.admin} expandedStep={expandedStep} setExpandedStep={setExpandedStep} selectedType="admin" />
                            </div>
                        )}

                        {/* Participant Card */}
                        <button
                            onClick={() => handleTypeSelect('participant')}
                            className={`card p-6 md:p-8 text-left transition-all group relative overflow-hidden ${
                                selectedType === 'participant' ? 'border-accent border-5' : 'border-border border-3 hover:border-accent'
                            }`}
                        >
                            <div className="absolute top-0 right-0 w-20 h-20 border-5 border-accent opacity-10 transform translate-x-10 -translate-y-10"></div>
                            <div className="relative z-10">
                                <div className={`inline-block px-3 py-1 border-3 mb-4 font-mono text-xs font-bold ${
                                    selectedType === 'participant' ? 'border-accent text-accent' : 'border-border'
                                }`}>
                                    BIDDER
                                </div>
                                <h3 className="font-grotesk text-xl md:text-2xl font-bold mb-3">
                                    PARTICIPANT
                                </h3>
                                <p className="font-mono text-sm md:text-base text-muted mb-4">
                                    Browse auctions. Select team. Place real-time bids. Win players within budget.
                                </p>
                                <div className="font-mono text-xs">
                                    <span className="text-accent">▸</span> /auction workflow
                                </div>
                            </div>
                        </button>

                        {/* Participant Details - Shows on mobile/tablet between participant and spectator */}
                        {selectedType === 'participant' && (
                            <div className="md:hidden col-span-1">
                                <GuideDetails guide={guides.participant} expandedStep={expandedStep} setExpandedStep={setExpandedStep} selectedType="participant" />
                            </div>
                        )}

                        {/* Spectator Card */}
                        <button
                            onClick={() => handleTypeSelect('spectator')}
                            className={`card p-6 md:p-8 text-left transition-all group relative overflow-hidden ${
                                selectedType === 'spectator' ? 'border-accent border-5' : 'border-border border-3 hover:border-accent'
                            }`}
                        >
                            <div className="absolute top-0 right-0 w-20 h-20 border-5 border-accent opacity-10 transform translate-x-10 -translate-y-10"></div>
                            <div className="relative z-10">
                                <div className={`inline-block px-3 py-1 border-3 mb-4 font-mono text-xs font-bold ${
                                    selectedType === 'spectator' ? 'border-accent text-accent' : 'border-border'
                                }`}>
                                    OBSERVER
                                </div>
                                <h3 className="font-grotesk text-xl md:text-2xl font-bold mb-3">
                                    SPECTATOR
                                </h3>
                                <p className="font-mono text-sm md:text-base text-muted mb-4">
                                    Watch LIVE auctions. No team selection. Read-only mode. Learn strategies.
                                </p>
                                <div className="font-mono text-xs">
                                    <span className="text-accent">▸</span> View-only access
                                </div>
                            </div>
                        </button>

                        {/* Spectator Details - Shows on mobile/tablet after spectator */}
                        {selectedType === 'spectator' && (
                            <div className="md:hidden col-span-1">
                                <GuideDetails guide={guides.spectator} expandedStep={expandedStep} setExpandedStep={setExpandedStep} selectedType="spectator" />
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Guide Content - Only shows on desktop (md and up) */}
            {currentGuide && (
                <section className="section py-12 md:py-16 lg:py-20 hidden md:block">
                    <GuideDetails guide={currentGuide} expandedStep={expandedStep} setExpandedStep={setExpandedStep} selectedType={selectedType} />
                </section>
            )}

            {/* Quick Reference Section */}
            <section className="section py-12 md:py-16 border-t-3 border-border">
                <div className="container max-w-5xl px-4">
                    <div className="text-center mb-8 md:mb-12">
                        <h2>TECHNICAL REFERENCE</h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-6 md:gap-8">
                        {/* Auction Statuses */}
                        <div className="card p-6 md:p-8 border-accent">
                            <div className="mb-4 flex items-center gap-3">
                                <div className="w-2 h-8 bg-accent"></div>
                                <h3 className="font-grotesk text-xl md:text-2xl font-bold">
                                    STATUSES
                                </h3>
                            </div>
                            <div className="space-y-4 font-mono text-sm md:text-base">
                                <div>
                                    <div className="font-bold mb-1 text-accent">UPCOMING</div>
                                    <div className="text-muted text-sm">
                                        Created, not started. Team selection allowed.
                                    </div>
                                </div>
                                <div>
                                    <div className="font-bold mb-1 text-accent">LIVE</div>
                                    <div className="text-muted text-sm">
                                        Active bidding. WebSocket connected. Real-time updates.
                                    </div>
                                </div>
                                <div>
                                    <div className="font-bold mb-1 text-accent">ENDED</div>
                                    <div className="text-muted text-sm">
                                        Completed. Final results available.
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Auction Types */}
                        <div className="card p-6 md:p-8 border-accent">
                            <div className="mb-4 flex items-center gap-3">
                                <div className="w-2 h-8 bg-accent"></div>
                                <h3 className="font-grotesk text-xl md:text-2xl font-bold">
                                    TYPES
                                </h3>
                            </div>
                            <div className="space-y-4 font-mono text-sm md:text-base">
                                <div>
                                    <div className="font-bold mb-1 text-accent">TEAM</div>
                                    <div className="text-muted text-sm">
                                        IPL-style. Multiple teams. Player roles. Budget constraints.
                                    </div>
                                </div>
                                <div>
                                    <div className="font-bold mb-1 text-accent">PRODUCT</div>
                                    <div className="text-muted text-sm">
                                        Simple item bidding. Highest bidder wins.
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Key Features */}
                        <div className="card p-6 md:p-8 border-accent">
                            <div className="mb-4 flex items-center gap-3">
                                <div className="w-2 h-8 bg-accent"></div>
                                <h3 className="font-grotesk text-xl md:text-2xl font-bold">
                                    FEATURES
                                </h3>
                            </div>
                            <div className="space-y-2 font-mono text-xs md:text-sm">
                                <div className="flex items-start gap-2">
                                    <span className="text-accent flex-shrink-0">▸</span>
                                    <span>WebSocket real-time sync</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-accent flex-shrink-0">▸</span>
                                    <span>Budget validation & tracking</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-accent flex-shrink-0">▸</span>
                                    <span>Squad size enforcement</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-accent flex-shrink-0">▸</span>
                                    <span>Activity feed audit trail</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-accent flex-shrink-0">▸</span>
                                    <span>Multi-team concurrent bidding</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
