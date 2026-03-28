'use client';

import { useState } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { useToast } from '@/components/ui/ToastProvider';
import { buildSamplePlayersCsv, samplePlayers } from '@/lib/auction/samplePlayers';
import TeamLogoMark from '@/components/auction/TeamLogoMark';

interface Player {
    id: string;
    name: string;
    description: string;
    role?: string;
    basePrice: number;
    soldPrice?: number;
    status: 'UNSOLD' | 'SOLD';
    imageUrl?: string;
    avatarUrl?: string;
    previousTeamShortName?: string | null;
    team?: {
        id: string;
        name: string;
        shortName: string;
        color: string;
        logo?: string | null;
    };
}

interface AdminPlayerManagerProps {
    auctionId: string;
    players: Player[];
    teamShortNames: string[];
    onPlayerAdded: () => void;
    currency: string;
    budgetDenomination?: string;
}

export default function AdminPlayerManager({
    auctionId,
    players,
    teamShortNames,
    onPlayerAdded,
    currency,
    budgetDenomination,
}: AdminPlayerManagerProps) {
    const { showToast, showConfirm } = useToast();
    const [showForm, setShowForm] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [bulkImportFile, setBulkImportFile] = useState<File | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        role: 'All-rounder',
        basePrice: '',
        imageUrl: '',
        previousTeamShortName: '',
    });

    const roles = ['Batsman', 'Bowler', 'All-rounder', 'Wicket-keeper'];
    const unsoldPlayers = players.filter((player) => player.status === 'UNSOLD');
    const soldPlayers = players.filter((player) => player.status === 'SOLD');

    const formatCurrency = (amount: number | string) => {
        const num = Number(amount).toFixed(2);
        if (budgetDenomination && budgetDenomination.trim() !== '') {
            return `${num} ${budgetDenomination} ${currency}`;
        }
        return `${num} ${currency}`;
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            role: 'All-rounder',
            basePrice: '',
            imageUrl: '',
            previousTeamShortName: '',
        });
    };

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
                    previousTeamShortName: formData.previousTeamShortName || undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to add player');
                return;
            }

            resetForm();
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

    const handleBulkImport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bulkImportFile) {
            setError('Please select a file');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const submitData = new FormData();
            submitData.append('file', bulkImportFile);
            submitData.append('auctionId', auctionId);

            const response = await fetch('/api/players/bulk-import', {
                method: 'POST',
                body: submitData,
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMessage = data.details?.length
                    ? `${data.error || 'Failed to import players'}\n${data.details.join('\n')}`
                    : data.error || 'Failed to import players';
                setError(errorMessage);
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
        const blob = new Blob([buildSamplePlayersCsv()], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'sample_players.csv';
        link.click();
        window.URL.revokeObjectURL(url);
    };

    const downloadSampleJSON = () => {
        const blob = new Blob([JSON.stringify(samplePlayers, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'sample_players.json';
        link.click();
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
                            setError('');
                        }}
                    >
                        {showBulkImport ? 'CANCEL' : 'BULK IMPORT'}
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => {
                            setShowForm(!showForm);
                            setShowBulkImport(false);
                            setError('');
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
                        <p className="font-mono text-sm mb-2">File Format</p>
                        <ul className="font-mono text-xs text-muted space-y-1 ml-4 list-disc">
                            <li>Supported formats: CSV and JSON</li>
                            <li>Required fields: `name`, `base price`</li>
                            <li>Optional fields: `description`, `role`, `avatar url`, `marquee set`, `previous team short name`</li>
                            <li>Previous team short name must match a team short name like `CSK` or `RCB`</li>
                            <li>Use blank or `none` if the player has no previous franchise association</li>
                            <li>Players are sorted by marquee tier during import</li>
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
                            <p className="font-mono text-sm text-red-500 whitespace-pre-wrap">{error}</p>
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
                            <p className="font-mono text-sm text-red-500 whitespace-pre-wrap">{error}</p>
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
                                {roles.map((role) => (
                                    <option key={role} value={role}>
                                        {role}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <Input
                            label={`Base Price (${budgetDenomination ? `${budgetDenomination} ` : ''}${currency})`}
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

                        <div>
                            <label className="font-mono text-sm uppercase tracking-wider mb-2 block">
                                Previous Team Short Name
                            </label>
                            <select
                                value={formData.previousTeamShortName}
                                onChange={(e) => setFormData({ ...formData, previousTeamShortName: e.target.value })}
                                className="w-full"
                            >
                                <option value="">None</option>
                                {teamShortNames.map((shortName) => (
                                    <option key={shortName} value={shortName}>
                                        {shortName}
                                    </option>
                                ))}
                            </select>
                            <p className="font-mono text-xs text-muted mt-2">
                                This is the franchise short name used to unlock RTM eligibility later.
                            </p>
                        </div>

                        <div className="pt-4 flex gap-3">
                            <Button type="submit" variant="primary" disabled={loading} className="flex-1">
                                {loading ? 'ADDING...' : 'ADD PLAYER'}
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => {
                                    setShowForm(false);
                                    setError('');
                                }}
                            >
                                CANCEL
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {unsoldPlayers.length > 0 && (
                <div>
                    <h4 className="font-mono text-lg font-bold mb-3 text-accent">AVAILABLE PLAYERS</h4>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {unsoldPlayers.map((player) => (
                            <Card key={player.id} className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                            <h5 className="font-mono font-bold">{player.name}</h5>
                                        {player.role && <Badge status="active">{player.role}</Badge>}
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
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="font-mono text-muted">Base Price:</span>
                                        <span className="font-mono font-bold">{formatCurrency(player.basePrice)}</span>
                                    </div>
                                    {player.previousTeamShortName && (
                                        <div className="flex justify-between">
                                            <span className="font-mono text-muted">Prev Team:</span>
                                            <span className="font-mono font-bold">{player.previousTeamShortName}</span>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

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
                                    {player.role && <Badge status="active">{player.role}</Badge>}
                                    {player.team && (
                                        <div className="mt-1 flex items-center gap-2">
                                            <TeamLogoMark team={player.team} size="sm" />
                                            <p className="font-mono text-sm font-bold" style={{ color: player.team.color }}>
                                                {player.team.shortName}
                                            </p>
                                        </div>
                                    )}
                                    {player.previousTeamShortName && (
                                        <p className="font-mono text-xs text-muted mt-1">
                                            Prev Team: {player.previousTeamShortName}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="font-mono text-muted">Base:</span>
                                        <span className="font-mono">{formatCurrency(player.basePrice)}</span>
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
        </div>
    );
}
