'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface BidFormProps {
    auctionId: string;
    currentPrice: number;
    minIncrement: number;
    currency: string;
    onBidPlaced?: () => void;
}

export default function BidForm({
    auctionId,
    currentPrice,
    minIncrement,
    currency,
    onBidPlaced,
}: BidFormProps) {
    const { data: session } = useSession();
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const minBid = currentPrice + minIncrement;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        if (!session) {
            setError('Please login to place a bid');
            return;
        }

        const bidAmount = parseFloat(amount);
        if (isNaN(bidAmount) || bidAmount < minBid) {
            setError(`Minimum bid is $${minBid.toFixed(2)}`);
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/bids', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    auctionId,
                    amount: bidAmount,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to place bid');
                return;
            }

            setSuccess(true);
            setAmount('');
            if (onBidPlaced) onBidPlaced();

            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!session) {
        return (
            <div className="card p-6 text-center">
                <p className="font-mono text-muted">Please login to place bids</p>
            </div>
        );
    }

    return (
        <div className="card p-6">
            <h3 className="mb-6">PLACE BID</h3>

            {error && (
                <div className="mb-4 p-4 border-3 border-red-500 bg-red-500/10">
                    <p className="font-mono text-red-500 text-sm">{error}</p>
                </div>
            )}

            {success && (
                <div className="mb-4 p-4 border-3 border-accent bg-accent/10 bid-flash">
                    <p className="font-mono text-accent text-sm">Bid placed successfully!</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <div className="flex justify-between mb-2">
                        <span className="font-mono text-sm text-muted">MINIMUM BID</span>
                        <span className="font-mono text-sm font-bold text-accent">
                            ${minBid.toFixed(2)}
                        </span>
                    </div>
                    <Input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder={minBid.toFixed(2)}
                        step="0.01"
                        min={minBid}
                        required
                    />
                </div>

                <Button
                    type="submit"
                    variant="primary"
                    className="w-full"
                    disabled={loading}
                >
                    {loading ? 'PLACING BID...' : 'PLACE BID'}
                </Button>
            </form>

            <div className="mt-4 pt-4 border-t-3 border-border">
                <div className="flex justify-between">
                    <span className="font-mono text-sm text-muted">YOUR WALLET</span>
                    <span className="font-mono text-sm font-bold">
                        ${parseFloat(session.user.wallet).toFixed(2)}
                    </span>
                </div>
            </div>
        </div>
    );
}
