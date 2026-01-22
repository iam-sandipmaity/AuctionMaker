'use client';

import { useState } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { useToast } from '@/components/ui/ToastProvider';

interface Player {
    id: string;
    name: string;
    description: string;
    role?: string;
    basePrice: number;
    soldPrice?: number;
    status: 'UNSOLD' | 'SOLD';
    imageUrl?: string;
    team?: {
        id: string;
        name: string;
        shortName: string;
        color: string;
    };
}

interface AdminPlayerManagerProps {
    auctionId: string;
    players: Player[];
    onPlayerAdded: () => void;
    currency: string;
    budgetDenomination?: string;
}

export default function AdminPlayerManager({ 
    auctionId, 
    players, 
    onPlayerAdded,
    currency,
    budgetDenomination
}: AdminPlayerManagerProps) {
    const { showToast, showConfirm } = useToast();
    const [showForm, setShowForm] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [bulkImportFile, setBulkImportFile] = useState<File | null>(null);
    
    // Helper to format currency with denomination
    const formatCurrency = (amount: number | string) => {
        const num = Number(amount).toFixed(2);
        if (budgetDenomination) {
            return `${num} ${budgetDenomination} ${currency}`;
        }
        return `${num} ${currency}`;
    };

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        role: 'All-rounder',
        basePrice: '',
        imageUrl: '',
    });

    const roles = ['Batsman', 'Bowler', 'All-rounder', 'Wicket-keeper'];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/players', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    auctionId,
                    name: formData.name,
                    description: formData.description,
                    role: formData.role,
                    basePrice: parseFloat(formData.basePrice),
                    imageUrl: formData.imageUrl || undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to add player');
                return;
            }

            setFormData({
                name: '',
                description: '',
                role: 'All-rounder',
                basePrice: '',
                imageUrl: '',
            });
            setShowForm(false);
            onPlayerAdded();
        } catch {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (playerId: string) => {
        showConfirm('Are you sure you want to delete this player?', async () => {
            try {
                const response = await fetch(`/api/players?playerId=${playerId}`, {
                    method: 'DELETE',
                });

                if (!response.ok) {
                    const data = await response.json();
                    showToast(data.error || 'Failed to delete player', 'error');
                    return;
                }

                showToast('Player deleted successfully', 'success');
                onPlayerAdded();
            } catch {
                showToast('An error occurred. Please try again.', 'error');
            }
        });
    };

    const unsoldPlayers = players.filter(p => p.status === 'UNSOLD');
    const soldPlayers = players.filter(p => p.status === 'SOLD');

    const handleBulkImport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bulkImportFile) {
            setError('Please select a file');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('file', bulkImportFile);
            formData.append('auctionId', auctionId);

            const response = await fetch('/api/players/bulk-import', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to import players');
                if (data.details) {
                    console.error('Validation errors:', data.details);
                }
                return;
            }

            showToast(`Successfully imported ${data.data.count} players`, 'success');
            setBulkImportFile(null);
            setShowBulkImport(false);
            onPlayerAdded();
        } catch {
            setError('An error occurred during import. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const downloadSampleCSV = () => {
        const csvContent = `name,description,role,base price,avatar url,marquee set
Virat Kohli,Indian cricket captain,Batsman,2000000,https://example.com/virat.jpg,1
Jasprit Bumrah,Fast bowler,Bowler,1800000,,1
Ravindra Jadeja,All-rounder,All-rounder,1500000,,2
Hardik Pandya,All-rounder,All-rounder,1200000,,2
Rishabh Pant,Wicket-keeper batsman,Wicket-keeper,1000000,,3
KL Rahul,Opening batsman,Batsman,900000,,3
Mohammed Shami,Fast bowler,Bowler,500000,,4
Shubman Gill,Young batsman,Batsman,300000,,5`;

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sample_players.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const downloadSampleJSON = () => {
        const jsonContent = [
            {
                name: "Virat Kohli",
                description: "Indian cricket captain",
                role: "Batsman",
                basePrice: 2000000,
                avatarUrl: "https://example.com/virat.jpg",
                marqueeSet: 1
            },
            {
                name: "Jasprit Bumrah",
                description: "Fast bowler",
                role: "Bowler",
                basePrice: 1800000,
                marqueeSet: 1
            },
            {
                name: "Ravindra Jadeja",
                description: "All-rounder",
                role: "All-rounder",
                basePrice: 1500000,
                marqueeSet: 2
            },
            {
                name: "Hardik Pandya",
                description: "All-rounder",
                role: "All-rounder",
                basePrice: 1200000,
                marqueeSet: 2
            },
            {
                name: "Rishabh Pant",
                description: "Wicket-keeper batsman",
                role: "Wicket-keeper",
                basePrice: 1000000,
                marqueeSet: 3
            }
        ];

        const blob = new Blob([JSON.stringify(jsonContent, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sample_players.json';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-mono text-xl font-bold">PLAYERS ({players.length})</h3>
                    <p className="font-mono text-sm text-muted">
                        Sold: {soldPlayers.length} | Unsold: {unsoldPlayers.length}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="secondary"
                        onClick={() => {
                            setShowBulkImport(!showBulkImport);
                            setShowForm(false);
                        }}
                    >
                        {showBulkImport ? 'CANCEL' : 'BULK IMPORT'}
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => {
                            setShowForm(!showForm);
                            setShowBulkImport(false);
                        }}
                    >
                        {showForm ? 'CANCEL' : '+ ADD PLAYER'}
                    </Button>
                </div>
            </div>

            {showBulkImport && (
                <Card className="p-6">
                    <h4 className="font-mono text-lg font-bold mb-4">BULK IMPORT PLAYERS</h4>
                    
                    <div className="mb-4 p-4 bg-accent/10 border-2 border-accent/20">
                        <p className="font-mono text-sm mb-2">📋 File Format:</p>
                        <ul className="font-mono text-xs text-muted space-y-1 ml-4">
                            <li>• Supported formats: CSV, JSON</li>
                            <li>• Required: name, base price</li>
                            <li>• Optional: description, role, avatar url, marquee set (1-5)</li>
                            <li>• Marquee Set 1 = Top tier, Set 5 = Low tier</li>
                            <li>• Players will be sorted by marquee tier</li>
                        </ul>
                        <div className="flex gap-2 mt-3">
                            <Button variant="secondary" onClick={downloadSampleCSV} className="text-xs">
                                DOWNLOAD SAMPLE CSV
                            </Button>
                            <Button variant="secondary" onClick={downloadSampleJSON} className="text-xs">
                                DOWNLOAD SAMPLE JSON
                            </Button>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 border-3 border-red-500 bg-red-500/10">
                            <p className="font-mono text-sm text-red-500">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleBulkImport} className="space-y-4">
                        <div>
                            <label className="font-mono text-sm uppercase tracking-wider mb-2 block">
                                Upload File (CSV or JSON)
                            </label>
                            <input
                                type="file"
                                accept=".csv,.json"
                                onChange={(e) => {
                                    setBulkImportFile(e.target.files?.[0] || null);
                                    setError('');
                                }}
                                className="w-full p-3 border-3 border-border bg-background font-mono text-sm"
                                required
                            />
                            {bulkImportFile && (
                                <p className="font-mono text-xs text-accent mt-2">
                                    Selected: {bulkImportFile.name}
                                </p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            variant="primary"
                            disabled={loading || !bulkImportFile}
                            className="w-full"
                        >
                            {loading ? 'IMPORTING...' : 'IMPORT PLAYERS'}
                        </Button>
                    </form>
                </Card>
            )}

            {showForm && (
                <Card className="p-6">
                    <h4 className="font-mono text-lg font-bold mb-4">ADD NEW PLAYER</h4>
                    
                    {error && (
                        <div className="mb-4 p-3 border-3 border-red-500 bg-red-500/10">
                            <p className="font-mono text-sm text-red-500">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            label="Player Name"
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            placeholder="Virat Kohli"
                        />

                        <div>
                            <label className="font-mono text-sm uppercase tracking-wider mb-2 block">
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                required
                                placeholder="Star batsman, former captain, aggressive batting style..."
                                rows={3}
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="font-mono text-sm uppercase tracking-wider mb-2 block">
                                Role
                            </label>
                            <select
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                className="w-full"
                            >
                                {roles.map(role => (
                                    <option key={role} value={role}>{role}</option>
                                ))}
                            </select>
                        </div>

                        <Input
                            label={`Base Price (${budgetDenomination ? budgetDenomination + ' ' : ''}${currency})`}
                            type="number"
                            value={formData.basePrice}
                            onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                            required
                            min="0.01"
                            step="0.01"
                            placeholder="2.00"
                        />

                        <Input
                            label="Image URL (optional)"
                            type="url"
                            value={formData.imageUrl}
                            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                            placeholder="https://example.com/player.jpg"
                        />

                        <div className="pt-4 flex gap-3">
                            <Button
                                type="submit"
                                variant="primary"
                                disabled={loading}
                                className="flex-1"
                            >
                                {loading ? 'ADDING...' : 'ADD PLAYER'}
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setShowForm(false)}
                            >
                                CANCEL
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* Unsold Players */}
            {unsoldPlayers.length > 0 && (
                <div>
                    <h4 className="font-mono text-lg font-bold mb-3 text-accent">AVAILABLE PLAYERS</h4>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {unsoldPlayers.map((player) => (
                            <Card key={player.id} className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                        <h5 className="font-mono font-bold">{player.name}</h5>
                                        {player.role && (
                                            <Badge status="active">{player.role}</Badge>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleDelete(player.id)}
                                        className="text-red-500 hover:text-red-700 font-mono text-sm"
                                    >
                                        DEL
                                    </button>
                                </div>
                                <p className="font-mono text-sm text-muted mb-3 line-clamp-2">
                                    {player.description}
                                </p>
                                <div className="flex justify-between text-sm">
                                    <span className="font-mono text-muted">Base Price:</span>
                                    <span className="font-mono font-bold">
                                        {formatCurrency(player.basePrice)}
                                    </span>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Sold Players */}
            {soldPlayers.length > 0 && (
                <div>
                    <h4 className="font-mono text-lg font-bold mb-3">SOLD PLAYERS</h4>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {soldPlayers.map((player) => (
                            <Card 
                                key={player.id} 
                                className="p-4 opacity-75"
                                style={player.team ? { borderColor: player.team.color } : undefined}
                            >
                                <div className="mb-2">
                                    <h5 className="font-mono font-bold">{player.name}</h5>
                                    {player.role && (
                                        <Badge status="active">{player.role}</Badge>
                                    )}
                                    {player.team && (
                                        <p 
                                            className="font-mono text-sm font-bold mt-1"
                                            style={{ color: player.team.color }}
                                        >
                                            {player.team.shortName}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="font-mono text-muted">Base:</span>
                                        <span className="font-mono">
                                            {formatCurrency(player.basePrice)}
                                        </span>
                                    </div>
                                    {player.soldPrice && (
                                        <div className="flex justify-between">
                                            <span className="font-mono text-muted">Sold:</span>
                                            <span className="font-mono font-bold text-accent">
                                                {formatCurrency(player.soldPrice)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {players.length === 0 && !showForm && (
                <div className="text-center py-12">
                    <p className="font-mono text-muted">No players added yet. Click "ADD PLAYER" to get started.</p>
                </div>
            )}
        </div>
    );
}
