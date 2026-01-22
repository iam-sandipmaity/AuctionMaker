'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { AuctionStatus } from '@prisma/client';
import { useToast } from '@/components/ui/ToastProvider';

interface Auction {
    id: string;
    title: string;
    description: string;
    status: AuctionStatus;
    auctionType: 'PRODUCT' | 'TEAM';
    currentPrice: number;
    currency: string;
    createdAt: Date;
    endTime: Date;
    _count: {
        bids: number;
        players?: number;
        teams?: number;
    };
}

interface ProfileClientProps {
    user: {
        id: string;
        name: string;
        username: string;
        email: string;
        preferredCurrency: string;
    };
    createdAuctions: Auction[];
    participatedAuctions: Auction[];
    visitedAuctions: Auction[];
}

export default function ProfileClient({
    user,
    createdAuctions,
    participatedAuctions,
    visitedAuctions,
}: ProfileClientProps) {
    const { showToast, showConfirm } = useToast();
    const [tab, setTab] = useState<'created' | 'participated' | 'visited'>('created');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const router = useRouter();

    const handleDeleteAuction = async (auctionId: string) => {
        showConfirm('Are you sure you want to delete this auction? This will remove it for all participants and cannot be undone.', async () => {
            setDeletingId(auctionId);
            try {
                const response = await fetch(`/api/auctions/${auctionId}`, {
                    method: 'DELETE',
                });

                if (!response.ok) {
                    const data = await response.json();
                    showToast(data.error || 'Failed to delete auction', 'error');
                    return;
                }

                showToast('Auction deleted successfully', 'success');
                // Refresh the page to update the list
                router.refresh();
            } catch (error) {
                console.error('Error deleting auction:', error);
                showToast('An error occurred while deleting the auction', 'error');
            } finally {
                setDeletingId(null);
            }
        });
    };

    const statusMap = {
        LIVE: 'live' as const,
        UPCOMING: 'upcoming' as const,
        ENDED: 'ended' as const,
    };

    const renderAuctionCard = (auction: Auction, showDelete: boolean = false) => (
        <Card key={auction.id} className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-4">
                <div className="flex-1">
                    <Link href={`/auction/${auction.id}`} className="hover:text-accent transition-colors">
                        <h3 className="text-xl md:text-2xl mb-2">{auction.title}</h3>
                    </Link>
                    <p className="font-mono text-sm text-muted line-clamp-2">{auction.description}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge status={statusMap[auction.status]}>{auction.status}</Badge>
                    {auction.auctionType === 'TEAM' && (
                        <Badge status="active">TEAM</Badge>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4">
                <div>
                    <p className="font-mono text-xs text-muted">CURRENT PRICE</p>
                    <p className="font-mono text-base md:text-lg font-bold text-accent">
                        {auction.currentPrice.toFixed(2)} {auction.currency}
                    </p>
                </div>
                <div>
                    <p className="font-mono text-xs text-muted">BIDS</p>
                    <p className="font-mono text-base md:text-lg font-bold">{auction._count.bids}</p>
                </div>
                {auction.auctionType === 'TEAM' && (
                    <>
                        <div>
                            <p className="font-mono text-xs text-muted">TEAMS</p>
                            <p className="font-mono text-base md:text-lg font-bold">{auction._count.teams || 0}</p>
                        </div>
                        <div>
                            <p className="font-mono text-xs text-muted">PLAYERS</p>
                            <p className="font-mono text-base md:text-lg font-bold">{auction._count.players || 0}</p>
                        </div>
                    </>
                )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t-3 border-border">
                <Link href={`/auction/${auction.id}`} className="flex-1">
                    <Button variant="primary" className="w-full text-sm md:text-base">
                        VIEW AUCTION
                    </Button>
                </Link>
                {showDelete && (
                    <Button
                        variant="secondary"
                        onClick={() => handleDeleteAuction(auction.id)}
                        disabled={deletingId === auction.id}
                        className="text-sm md:text-base border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                    >
                        {deletingId === auction.id ? 'DELETING...' : 'DELETE'}
                    </Button>
                )}
            </div>
        </Card>
    );

    return (
        <div className="container section">
            {/* Profile Header */}
            <div className="mb-8 md:mb-12 px-4">
                <h1 className="mb-4">MY PROFILE</h1>
                <Card className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-2xl md:text-3xl mb-2">{user.name}</h2>
                            <p className="font-mono text-muted mb-1">@{user.username}</p>
                            <p className="font-mono text-sm text-muted">{user.email}</p>
                        </div>
                        <div className="text-left md:text-right">
                            <p className="font-mono text-sm text-muted mb-1">PREFERRED CURRENCY</p>
                            <p className="font-mono text-2xl md:text-3xl font-bold text-accent">
                                {user.preferredCurrency}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Tabs */}
            <div className="mb-6 md:mb-8 px-4">
                <div className="flex gap-2 flex-wrap">
                    <Button
                        variant={tab === 'created' ? 'primary' : 'secondary'}
                        onClick={() => setTab('created')}
                        className="text-sm md:text-base px-4 md:px-6 py-2"
                    >
                        CREATED ({createdAuctions.length})
                    </Button>
                    <Button
                        variant={tab === 'participated' ? 'primary' : 'secondary'}
                        onClick={() => setTab('participated')}
                        className="text-sm md:text-base px-4 md:px-6 py-2"
                    >
                        PARTICIPATED ({participatedAuctions.length})
                    </Button>
                    <Button
                        variant={tab === 'visited' ? 'primary' : 'secondary'}
                        onClick={() => setTab('visited')}
                        className="text-sm md:text-base px-4 md:px-6 py-2"
                    >
                        VISITED ({visitedAuctions.length})
                    </Button>
                </div>
            </div>

            {/* Auction Lists */}
            <div className="px-4">
                {tab === 'created' && (
                    <div className="space-y-4 md:space-y-6">
                        {createdAuctions.length === 0 ? (
                            <Card className="p-8 md:p-12 text-center">
                                <p className="font-mono text-lg md:text-xl text-muted">
                                    You haven't created any auctions yet.
                                </p>
                                <Link href="/admin" className="inline-block mt-4">
                                    <Button variant="primary">CREATE YOUR FIRST AUCTION</Button>
                                </Link>
                            </Card>
                        ) : (
                            createdAuctions.map(auction => renderAuctionCard(auction, true))
                        )}
                    </div>
                )}

                {tab === 'participated' && (
                    <div className="space-y-4 md:space-y-6">
                        {participatedAuctions.length === 0 ? (
                            <Card className="p-8 md:p-12 text-center">
                                <p className="font-mono text-lg md:text-xl text-muted">
                                    You haven't participated in any auctions yet.
                                </p>
                                <Link href="/auction" className="inline-block mt-4">
                                    <Button variant="primary">BROWSE AUCTIONS</Button>
                                </Link>
                            </Card>
                        ) : (
                            participatedAuctions.map(auction => renderAuctionCard(auction))
                        )}
                    </div>
                )}

                {tab === 'visited' && (
                    <div className="space-y-4 md:space-y-6">
                        {visitedAuctions.length === 0 ? (
                            <Card className="p-8 md:p-12 text-center">
                                <p className="font-mono text-lg md:text-xl text-muted">
                                    No auction viewing history yet.
                                </p>
                            </Card>
                        ) : (
                            visitedAuctions.map(auction => renderAuctionCard(auction))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
