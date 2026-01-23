'use client';

import { useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';

type UserType = 'admin' | 'player' | 'spectator';

const guides = {
    admin: {
        title: 'FOR ADMINS',
        subtitle: 'Create & Manage Auctions',
        icon: '⚡',
        color: 'accent',
        steps: [
            {
                number: '01',
                title: 'Choose Auction Type',
                description: 'Select between Product Auction or IPL-Style Team Auction based on your needs.',
                details: [
                    'Product Auction: Simple item bidding with highest bidder wins',
                    'Team Auction: IPL-style player auction with team budgets and squad limits',
                ],
                tip: 'Team auctions are perfect for sports leagues, fantasy tournaments, and competitive events.'
            },
            {
                number: '02',
                title: 'Configure Auction Settings',
                description: 'Set up your auction parameters and rules.',
                details: [
                    'Set auction name and description',
                    'Configure currency denomination (₹, $, €, etc.)',
                    'For Team Auction: Set team budgets, squad size limits (min/max)',
                    'For Product Auction: Add items with base prices',
                ],
                tip: 'Use realistic budgets - IPL typically uses 100 Crores per team.'
            },
            {
                number: '03',
                title: 'Add Teams & Players/Items',
                description: 'Populate your auction with participants or items.',
                details: [
                    'Team Auction: Add teams and create player pool with roles (Batsman, Bowler, All-rounder, Wicket-keeper)',
                    'Product Auction: Add items with descriptions and starting bids',
                    'Set base prices for each player/item',
                ],
                tip: 'You can import bulk data or add items one by one.'
            },
            {
                number: '04',
                title: 'Start Auction as Auctioneer',
                description: 'Control the entire auction flow in real-time.',
                details: [
                    'Select items/players to put up for bidding',
                    'Monitor live bids from all teams',
                    'Accept or reject final bids',
                    'Move to next item when ready',
                    'Track budgets and squad sizes in real-time',
                ],
                tip: 'Use the Auctioneer Control Panel for full visibility and control.'
            },
            {
                number: '05',
                title: 'Monitor & Complete',
                description: 'Track progress and finalize the auction.',
                details: [
                    'View live activity feed of all bids',
                    'Check remaining budgets per team',
                    'See sold vs unsold items/players',
                    'End auction when complete',
                    'Export final results',
                ],
                tip: 'All data is saved automatically - you can pause and resume anytime.'
            },
        ],
    },
    player: {
        title: 'FOR PLAYERS',
        subtitle: 'Join & Participate in Auctions',
        icon: '🎯',
        color: 'accent',
        steps: [
            {
                number: '01',
                title: 'Register & Login',
                description: 'Create your account to participate in auctions.',
                details: [
                    'Sign up with username, email, and password',
                    'Verify your account',
                    'Login to access auction dashboard',
                ],
                tip: 'Choose a memorable username - it will be visible to other participants.'
            },
            {
                number: '02',
                title: 'Browse Available Auctions',
                description: 'Find auctions to join from the Auctions page.',
                details: [
                    'View all active and upcoming auctions',
                    'Check auction type (Product or Team)',
                    'See auction details, budgets, and rules',
                    'Filter by status: Active, Upcoming, Completed',
                ],
                tip: 'You can join multiple auctions simultaneously.'
            },
            {
                number: '03',
                title: 'Join as Team',
                description: 'Select your team and enter the auction room.',
                details: [
                    'Choose from available teams',
                    'Each team has a budget allocation',
                    'For Team Auction: Check your squad requirements',
                    'Wait for admin to start the auction',
                ],
                tip: 'Join early to review the player/item pool before bidding starts.'
            },
            {
                number: '04',
                title: 'Place Strategic Bids',
                description: 'Bid on items/players in real-time.',
                details: [
                    'Wait for auctioneer to present an item/player',
                    'Enter your bid amount (must be higher than current bid)',
                    'Submit quickly - auctions move fast!',
                    'Monitor your remaining budget',
                    'Track your squad composition (for Team Auction)',
                ],
                tip: 'Use quick bid increments for speed. Watch your budget carefully!'
            },
            {
                number: '05',
                title: 'Build Your Squad/Collection',
                description: 'Win items and complete your team.',
                details: [
                    'Highest bidder wins when auctioneer accepts',
                    'Your budget updates automatically after each win',
                    'For Team Auction: Ensure balanced squad (meet min squad size)',
                    'View your acquired items/players in real-time',
                    'Continue bidding until auction ends',
                ],
                tip: 'Don\'t spend all your budget early - save for key targets!'
            },
        ],
    },
    spectator: {
        title: 'FOR SPECTATORS',
        subtitle: 'Watch Auctions Live',
        icon: '👁️',
        color: 'accent',
        steps: [
            {
                number: '01',
                title: 'Access Auction Room',
                description: 'Join as a viewer without participating.',
                details: [
                    'No registration required for some public auctions',
                    'Or login and select "Watch Only" mode',
                    'View live auction feed without bidding rights',
                ],
                tip: 'Perfect for learning how auctions work before participating.'
            },
            {
                number: '02',
                title: 'Real-Time Viewing',
                description: 'Watch all the action unfold live.',
                details: [
                    'See current item/player being auctioned',
                    'View all bids as they come in',
                    'Track team budgets and spending',
                    'Monitor squad compositions',
                    'See who wins each item',
                ],
                tip: 'Use this to analyze bidding strategies for future participation.'
            },
            {
                number: '03',
                title: 'Activity Feed',
                description: 'Follow complete auction timeline.',
                details: [
                    'Chronological feed of all events',
                    'Bid history for each item',
                    'Team-wise spending breakdown',
                    'Sold vs unsold items',
                    'Live statistics and analytics',
                ],
                tip: 'The activity feed helps you understand auction dynamics.'
            },
            {
                number: '04',
                title: 'Learn & Analyze',
                description: 'Study auction patterns and strategies.',
                details: [
                    'Observe successful bidding strategies',
                    'See how teams manage budgets',
                    'Learn auction timing and pace',
                    'Understand item/player valuations',
                    'Prepare for your own participation',
                ],
                tip: 'Watching others is the best way to learn auction strategy!'
            },
        ],
    },
};

export default function HowItWorksPage() {
    const [selectedType, setSelectedType] = useState<UserType>('admin');
    const [expandedStep, setExpandedStep] = useState<number | null>(0);

    const currentGuide = guides[selectedType];

    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <section className="section py-12 md:py-16 lg:py-20 border-b-3 border-border">
                <div className="container">
                    <h1 className="text-center mb-4 md:mb-6">
                        HOW IT <span className="text-accent">WORKS</span>
                    </h1>
                    <p className="text-center text-lg md:text-xl lg:text-2xl max-w-4xl mx-auto text-muted font-mono px-4">
                        Complete guide to using AuctionMaker. Choose your role below to get started.
                    </p>
                </div>
            </section>

            {/* User Type Selection */}
            <section className="section py-8 md:py-12 border-b-3 border-border bg-background">
                <div className="container">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-6xl mx-auto px-4">
                        {/* Admin Card */}
                        <button
                            onClick={() => {
                                setSelectedType('admin');
                                setExpandedStep(0);
                            }}
                            className={`card p-6 md:p-8 text-left transition-all transform hover:scale-105 ${
                                selectedType === 'admin' ? 'border-accent border-5 bg-accent/5' : 'border-border border-3'
                            }`}
                        >
                            <div className="text-4xl md:text-5xl mb-4">⚡</div>
                            <h3 className="font-grotesk text-xl md:text-2xl font-bold mb-3">
                                ADMIN
                            </h3>
                            <p className="font-mono text-sm md:text-base text-muted">
                                Create and manage auctions. Control the entire auction flow as auctioneer.
                            </p>
                            <div className="mt-4 font-mono text-xs text-accent">
                                {selectedType === 'admin' ? '→ SELECTED' : 'CLICK TO VIEW'}
                            </div>
                        </button>

                        {/* Player Card */}
                        <button
                            onClick={() => {
                                setSelectedType('player');
                                setExpandedStep(0);
                            }}
                            className={`card p-6 md:p-8 text-left transition-all transform hover:scale-105 ${
                                selectedType === 'player' ? 'border-accent border-5 bg-accent/5' : 'border-border border-3'
                            }`}
                        >
                            <div className="text-4xl md:text-5xl mb-4">🎯</div>
                            <h3 className="font-grotesk text-xl md:text-2xl font-bold mb-3">
                                PLAYER
                            </h3>
                            <p className="font-mono text-sm md:text-base text-muted">
                                Join auctions, place bids, and build your team or item collection.
                            </p>
                            <div className="mt-4 font-mono text-xs text-accent">
                                {selectedType === 'player' ? '→ SELECTED' : 'CLICK TO VIEW'}
                            </div>
                        </button>

                        {/* Spectator Card */}
                        <button
                            onClick={() => {
                                setSelectedType('spectator');
                                setExpandedStep(0);
                            }}
                            className={`card p-6 md:p-8 text-left transition-all transform hover:scale-105 ${
                                selectedType === 'spectator' ? 'border-accent border-5 bg-accent/5' : 'border-border border-3'
                            }`}
                        >
                            <div className="text-4xl md:text-5xl mb-4">👁️</div>
                            <h3 className="font-grotesk text-xl md:text-2xl font-bold mb-3">
                                SPECTATOR
                            </h3>
                            <p className="font-mono text-sm md:text-base text-muted">
                                Watch auctions live without participating. Learn and analyze strategies.
                            </p>
                            <div className="mt-4 font-mono text-xs text-accent">
                                {selectedType === 'spectator' ? '→ SELECTED' : 'CLICK TO VIEW'}
                            </div>
                        </button>
                    </div>
                </div>
            </section>

            {/* Guide Content */}
            <section className="section py-12 md:py-16 lg:py-20">
                <div className="container max-w-5xl">
                    {/* Guide Header */}
                    <div className="mb-12 md:mb-16 text-center px-4">
                        <div className="text-6xl md:text-7xl mb-4">{currentGuide.icon}</div>
                        <h2 className="mb-4">{currentGuide.title}</h2>
                        <p className="text-xl md:text-2xl font-mono text-accent">
                            {currentGuide.subtitle}
                        </p>
                    </div>

                    {/* Steps */}
                    <div className="space-y-6 md:space-y-8 px-4">
                        {currentGuide.steps.map((step, index) => (
                            <div
                                key={index}
                                className={`card transition-all ${
                                    expandedStep === index
                                        ? 'border-accent border-5'
                                        : 'border-border border-3'
                                }`}
                            >
                                {/* Step Header */}
                                <button
                                    onClick={() => setExpandedStep(expandedStep === index ? null : index)}
                                    className="w-full p-6 md:p-8 text-left hover:bg-accent/5 transition-colors"
                                >
                                    <div className="flex items-start gap-4 md:gap-6">
                                        <div className="flex-shrink-0">
                                            <div className="font-grotesk text-3xl md:text-4xl font-bold text-accent">
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
                                                className={`text-2xl transform transition-transform ${
                                                    expandedStep === index ? 'rotate-180' : ''
                                                }`}
                                            >
                                                ▼
                                            </div>
                                        </div>
                                    </div>
                                </button>

                                {/* Expanded Content */}
                                {expandedStep === index && (
                                    <div className="px-6 md:px-8 pb-6 md:pb-8 border-t-3 border-border">
                                        <div className="pt-6 space-y-4">
                                            {/* Details List */}
                                            <div className="space-y-3">
                                                {step.details.map((detail, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-start gap-3 font-mono text-sm md:text-base"
                                                    >
                                                        <span className="text-accent flex-shrink-0 mt-1">▸</span>
                                                        <span>{detail}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Tip Box */}
                                            <div className="mt-6 p-4 md:p-5 border-3 border-accent bg-accent/5">
                                                <div className="flex items-start gap-3">
                                                    <span className="text-xl flex-shrink-0">💡</span>
                                                    <div>
                                                        <div className="font-grotesk font-bold text-sm mb-1 text-accent">
                                                            PRO TIP
                                                        </div>
                                                        <div className="font-mono text-sm">
                                                            {step.tip}
                                                        </div>
                                                    </div>
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
                        <div className="card p-8 md:p-10 border-accent">
                            <h3 className="font-grotesk text-2xl md:text-3xl font-bold mb-4">
                                READY TO GET STARTED?
                            </h3>
                            <p className="font-mono text-base md:text-lg text-muted mb-6">
                                {selectedType === 'admin' && 'Create your first auction and start managing bids in real-time.'}
                                {selectedType === 'player' && 'Join an auction and start bidding on your favorite items or players.'}
                                {selectedType === 'spectator' && 'Browse available auctions and watch the action unfold live.'}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                {selectedType === 'admin' && (
                                    <Link href="/admin">
                                        <Button variant="primary" className="text-lg px-8 py-4 w-full sm:w-auto">
                                            CREATE AUCTION →
                                        </Button>
                                    </Link>
                                )}
                                {selectedType === 'player' && (
                                    <Link href="/auction">
                                        <Button variant="primary" className="text-lg px-8 py-4 w-full sm:w-auto">
                                            BROWSE AUCTIONS →
                                        </Button>
                                    </Link>
                                )}
                                {selectedType === 'spectator' && (
                                    <Link href="/auction">
                                        <Button variant="primary" className="text-lg px-8 py-4 w-full sm:w-auto">
                                            VIEW AUCTIONS →
                                        </Button>
                                    </Link>
                                )}
                                <Link href="/">
                                    <Button variant="secondary" className="text-lg px-8 py-4 w-full sm:w-auto">
                                        BACK TO HOME
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Quick Reference Section */}
            <section className="section py-12 md:py-16 border-t-3 border-border bg-background/50">
                <div className="container max-w-5xl px-4">
                    <h2 className="text-center mb-8 md:mb-12">QUICK REFERENCE</h2>
                    <div className="grid md:grid-cols-2 gap-6 md:gap-8">
                        {/* Auction Types */}
                        <div className="card p-6 md:p-8 border-border">
                            <h3 className="font-grotesk text-xl md:text-2xl font-bold mb-4 text-accent">
                                AUCTION TYPES
                            </h3>
                            <div className="space-y-4 font-mono text-sm md:text-base">
                                <div>
                                    <div className="font-bold mb-1">IPL-STYLE TEAM AUCTION</div>
                                    <div className="text-muted">
                                        Multiple teams bid on players. Budgets, squad limits, and roles.
                                    </div>
                                </div>
                                <div>
                                    <div className="font-bold mb-1">PRODUCT AUCTION</div>
                                    <div className="text-muted">
                                        Simple item bidding. Highest bidder wins each item.
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Key Features */}
                        <div className="card p-6 md:p-8 border-border">
                            <h3 className="font-grotesk text-xl md:text-2xl font-bold mb-4 text-accent">
                                KEY FEATURES
                            </h3>
                            <div className="space-y-2 font-mono text-sm md:text-base">
                                <div className="flex items-start gap-2">
                                    <span className="text-accent">✓</span>
                                    <span>Real-time WebSocket bidding</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-accent">✓</span>
                                    <span>Live activity feed & updates</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-accent">✓</span>
                                    <span>Multi-team concurrent bidding</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-accent">✓</span>
                                    <span>Budget tracking & validation</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-accent">✓</span>
                                    <span>Auto-save & pause/resume</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
