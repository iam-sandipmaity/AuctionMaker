'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function AdminPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        auctionType: 'TEAM' as 'PRODUCT' | 'TEAM',
        startingPrice: '',
        minIncrement: '',
        duration: '300', // default 5 hours for team auctions
        maxParticipants: '',
        currency: 'Crores',
        // Team auction specific
        teamBudget: '100',
        minSquadSize: '11',
        maxSquadSize: '15',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        if (!session) {
            setError('Please login to create auctions');
            return;
        }

        setLoading(true);

        try {
            const requestData: any = {
                title: formData.title,
                description: formData.description,
                auctionType: formData.auctionType,
                startingPrice: parseFloat(formData.startingPrice),
                minIncrement: parseFloat(formData.minIncrement),
                duration: parseInt(formData.duration),
                maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : undefined,
                currency: formData.currency,
            };

            // Add team auction specific fields
            if (formData.auctionType === 'TEAM') {
                requestData.teamBudget = parseFloat(formData.teamBudget);
                requestData.minSquadSize = parseInt(formData.minSquadSize);
                requestData.maxSquadSize = parseInt(formData.maxSquadSize);
            }

            const response = await fetch('/api/auctions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to create auction');
                return;
            }

            setSuccess(true);
            setFormData({
                title: '',
                description: '',
                auctionType: 'TEAM' as 'PRODUCT' | 'TEAM',
                startingPrice: '',
                minIncrement: '',
                duration: '300',
                maxParticipants: '',
                currency: 'Crores',
                teamBudget: '100',
                minSquadSize: '11',
                maxSquadSize: '15',
            });

            // Redirect to the new auction after a short delay
            setTimeout(() => {
                router.push(`/auction/${data.data.id}`);
            }, 1500);
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!session) {
        return (
            <div className="container section min-h-[80vh] flex items-center justify-center">
                <Card className="text-center p-12">
                    <h2 className="mb-4">UNAUTHORIZED</h2>
                    <p className="font-mono text-muted">Please login to access the admin panel</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="container section">
            <div className="mb-12">
                <h1 className="mb-4">ADMIN PANEL</h1>
                <p className="text-xl font-mono text-muted">
                    Create and manage auctions
                </p>
            </div>

            <div className="max-w-3xl mx-auto">
                <Card className="p-8">
                    <h2 className="mb-8">CREATE NEW AUCTION</h2>

                    {error && (
                        <div className="mb-6 p-4 border-3 border-red-500 bg-red-500/10">
                            <p className="font-mono text-red-500">{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 p-4 border-3 border-accent bg-accent/10">
                            <p className="font-mono text-accent">
                                Auction created successfully! Redirecting...
                            </p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Input
                            label="Auction Title"
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                            placeholder="Vintage Watch Collection"
                        />

                        <div>
                            <label className="font-mono text-sm uppercase tracking-wider mb-2 block">
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                required
                                placeholder="Detailed description of the auction item..."
                                rows={4}
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="font-mono text-sm uppercase tracking-wider mb-2 block">
                                Auction Type
                            </label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="auctionType"
                                        value="PRODUCT"
                                        checked={formData.auctionType === 'PRODUCT'}
                                        onChange={(e) => setFormData({ ...formData, auctionType: e.target.value as 'PRODUCT' | 'TEAM' })}
                                        className="w-5 h-5"
                                    />
                                    <span className="font-mono text-lg">Product Auction</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="auctionType"
                                        value="TEAM"
                                        checked={formData.auctionType === 'TEAM'}
                                        onChange={(e) => setFormData({ ...formData, auctionType: e.target.value as 'PRODUCT' | 'TEAM' })}
                                        className="w-5 h-5"
                                    />
                                    <span className="font-mono text-lg">IPL Style Team Auction</span>
                                </label>
                            </div>
                            <p className="text-sm font-mono text-muted mt-2">
                                {formData.auctionType === 'PRODUCT'
                                    ? 'Standard auction for products, items, or services'
                                    : 'Team-based player auction like IPL - Admin acts as auctioneer, teams bid on players'}
                            </p>
                        </div>

                        {formData.auctionType === 'TEAM' && (
                            <div className="p-6 border-3 border-accent bg-accent/5 space-y-6">
                                <h3 className="font-mono text-lg font-bold text-accent">IPL AUCTION SETTINGS</h3>
                                
                                <div className="grid md:grid-cols-2 gap-6">
                                    <Input
                                        label="Team Budget (Crores)"
                                        type="number"
                                        value={formData.teamBudget}
                                        onChange={(e) => setFormData({ ...formData, teamBudget: e.target.value })}
                                        required
                                        min="1"
                                        step="0.01"
                                        placeholder="100"
                                    />

                                    <Input
                                        label="Currency Name"
                                        type="text"
                                        value={formData.currency}
                                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                        required
                                        placeholder="Crores"
                                    />
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <Input
                                        label="Minimum Squad Size"
                                        type="number"
                                        value={formData.minSquadSize}
                                        onChange={(e) => setFormData({ ...formData, minSquadSize: e.target.value })}
                                        required
                                        min="1"
                                        placeholder="11"
                                    />

                                    <Input
                                        label="Maximum Squad Size"
                                        type="number"
                                        value={formData.maxSquadSize}
                                        onChange={(e) => setFormData({ ...formData, maxSquadSize: e.target.value })}
                                        required
                                        min="1"
                                        placeholder="15"
                                    />
                                </div>

                                <p className="text-sm font-mono text-muted">
                                    After creating the auction, you'll be able to add teams and players from the auction control panel.
                                </p>
                            </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-6">
                            {formData.auctionType === 'PRODUCT' && (
                                <>
                                    <Input
                                        label="Starting Price"
                                        type="number"
                                        value={formData.startingPrice}
                                        onChange={(e) => setFormData({ ...formData, startingPrice: e.target.value })}
                                        required
                                        min="0.01"
                                        step="0.01"
                                        placeholder="100.00"
                                    />

                                    <Input
                                        label="Minimum Increment"
                                        type="number"
                                        value={formData.minIncrement}
                                        onChange={(e) => setFormData({ ...formData, minIncrement: e.target.value })}
                                        required
                                        min="0.01"
                                        step="0.01"
                                        placeholder="5.00"
                                    />
                                </>
                            )}

                            {formData.auctionType === 'TEAM' && (
                                <>
                                    <Input
                                        label="Base Price (Starting Bid)"
                                        type="number"
                                        value={formData.startingPrice}
                                        onChange={(e) => setFormData({ ...formData, startingPrice: e.target.value })}
                                        required
                                        min="0.01"
                                        step="0.01"
                                        placeholder="0.20"
                                        helpText="Default base price for players"
                                    />

                                    <Input
                                        label="Bid Increment"
                                        type="number"
                                        value={formData.minIncrement}
                                        onChange={(e) => setFormData({ ...formData, minIncrement: e.target.value })}
                                        required
                                        min="0.01"
                                        step="0.01"
                                        placeholder="0.05"
                                        helpText="Minimum bid increase amount"
                                    />
                                </>
                            )}
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <Input
                                label="Duration (minutes)"
                                type="number"
                                value={formData.duration}
                                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                required
                                min="1"
                                placeholder={formData.auctionType === 'TEAM' ? '300' : '60'}
                            />

                            <Input
                                label="Max Teams/Participants"
                                type="number"
                                value={formData.maxParticipants}
                                onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
                                min="1"
                                placeholder={formData.auctionType === 'TEAM' ? '8' : 'Unlimited'}
                            />
                        </div>

                        {formData.auctionType === 'PRODUCT' && (
                            <Input
                                label="Currency"
                                type="text"
                                value={formData.currency}
                                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                required
                                placeholder="USD"
                            />
                        )}

                        <Button
                            type="submit"
                            variant="primary"
                            className="w-full"
                            disabled={loading}
                        >
                            {loading ? 'CREATING AUCTION...' : 'CREATE AUCTION'}
                        </Button>
                    </form>
                </Card>

                <div className="mt-8 text-center">
                    <Button
                        variant="secondary"
                        onClick={() => router.push('/auction')}
                    >
                        ← BACK TO AUCTIONS
                    </Button>
                </div>
            </div>
        </div>
    );
}
