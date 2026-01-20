'use client';

import { formatDistanceToNow } from 'date-fns';
import { Bid } from '@/types';
import Badge from '@/components/ui/Badge';

interface ActivityFeedProps {
    bids: Bid[];
    currentUserId?: string;
}

export default function ActivityFeed({ bids, currentUserId }: ActivityFeedProps) {
    if (bids.length === 0) {
        return (
            <div className="card p-6 text-center">
                <p className="font-mono text-muted">No bids yet. Be the first!</p>
            </div>
        );
    }

    return (
        <div className="card p-6">
            <h3 className="mb-6">LIVE ACTIVITY</h3>

            <div className="space-y-4 max-h-96 overflow-y-auto">
                {bids.map((bid, index) => {
                    const amount = typeof bid.amount === 'object'
                        ? parseFloat(bid.amount.toString())
                        : bid.amount;

                    const isCurrentUser = bid.userId === currentUserId;
                    const isWinning = bid.isWinning;

                    return (
                        <div
                            key={bid.id}
                            className={`p-4 border-l-5 ${isWinning ? 'border-accent bg-accent/5' : 'border-border'
                                } ${index === 0 ? 'bid-flash' : ''}`}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold">
                                        {isCurrentUser ? 'YOU' : `@${bid.user?.username || 'Unknown'}`}
                                    </span>
                                    {isWinning && <Badge status="winning">WINNING</Badge>}
                                </div>
                                <span className="font-mono text-sm text-muted">
                                    {formatDistanceToNow(new Date(bid.timestamp), { addSuffix: true })}
                                </span>
                            </div>
                            <div className="font-mono text-2xl font-bold text-accent">
                                ${amount.toFixed(2)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
