'use client';

import { useState } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

interface Team {
    id: string;
    name: string;
    shortName: string;
    color: string;
    logo?: string;
    budget: number;
    totalBudget: number;
    squadSize: number;
}

interface AdminTeamManagerProps {
    auctionId: string;
    teams: Team[];
    onTeamAdded: () => void;
    teamBudget: number;
    currency: string;
}

export default function AdminTeamManager({ 
    auctionId, 
    teams, 
    onTeamAdded,
    teamBudget,
    currency
}: AdminTeamManagerProps) {
    const [showForm, setShowForm] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [bulkImportFile, setBulkImportFile] = useState<File | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        shortName: '',
        color: '#3B82F6',
        logo: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/teams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    auctionId,
                    ...formData,
                    budget: teamBudget,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to create team');
                return;
            }

            setFormData({
                name: '',
                shortName: '',
                color: '#3B82F6',
                logo: '',
            });
            setShowForm(false);
            onTeamAdded();
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (teamId: string) => {
        if (!confirm('Are you sure you want to delete this team?')) return;

        try {
            const response = await fetch(`/api/teams?teamId=${teamId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const data = await response.json();
                alert(data.error || 'Failed to delete team');
                return;
            }

            onTeamAdded();
        } catch (err) {
            alert('An error occurred. Please try again.');
        }
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
            const formData = new FormData();
            formData.append('file', bulkImportFile);
            formData.append('auctionId', auctionId);

            const response = await fetch('/api/teams/bulk-import', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to import teams');
                if (data.details) {
                    console.error('Validation errors:', data.details);
                }
                return;
            }

            alert(`Successfully imported ${data.data.count} teams`);
            setBulkImportFile(null);
            setShowBulkImport(false);
            onTeamAdded();
        } catch (err) {
            setError('An error occurred during import. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const downloadSampleCSV = () => {
        const csvContent = `name,short name,color,logo
Mumbai Indians,MI,#004BA0,https://example.com/mi.png
Chennai Super Kings,CSK,#FDB913,https://example.com/csk.png
Royal Challengers Bangalore,RCB,#EC1C24,
Kolkata Knight Riders,KKR,#3A225D,
Delhi Capitals,DC,#282968,
Rajasthan Royals,RR,#254AA5,
Punjab Kings,PBKS,#ED1B24,
Sunrisers Hyderabad,SRH,#FF822A,
Gujarat Titans,GT,#1C2841,
Lucknow Super Giants,LSG,#4E9ED9,`;

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sample_teams.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const downloadSampleJSON = () => {
        const jsonContent = [
            {
                name: "Mumbai Indians",
                shortName: "MI",
                color: "#004BA0",
                logo: "https://example.com/mi.png"
            },
            {
                name: "Chennai Super Kings",
                shortName: "CSK",
                color: "#FDB913"
            },
            {
                name: "Royal Challengers Bangalore",
                shortName: "RCB",
                color: "#EC1C24"
            },
            {
                name: "Kolkata Knight Riders",
                shortName: "KKR",
                color: "#3A225D"
            },
            {
                name: "Delhi Capitals",
                shortName: "DC",
                color: "#282968"
            }
        ];

        const blob = new Blob([JSON.stringify(jsonContent, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sample_teams.json';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="font-mono text-xl font-bold">TEAMS ({teams.length})</h3>
                <div className="flex gap-2">
                    <Button
                        variant="secondary"
                        onClick={() => {
                            setShowBulkImport(!showBulkImport);
                            setShowForm(false);
                        }}
                    >
                        {showBulkImport ? 'CANCEL' : '📁 BULK IMPORT'}
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => {
                            setShowForm(!showForm);
                            setShowBulkImport(false);
                        }}
                    >
                        {showForm ? 'CANCEL' : '+ ADD TEAM'}
                    </Button>
                </div>
            </div>

            {showBulkImport && (
                <Card className="p-6">
                    <h4 className="font-mono text-lg font-bold mb-4">BULK IMPORT TEAMS</h4>
                    
                    <div className="mb-4 p-4 bg-accent/10 border-2 border-accent/20">
                        <p className="font-mono text-sm mb-2">📋 File Format:</p>
                        <ul className="font-mono text-xs text-muted space-y-1 ml-4">
                            <li>• Supported formats: CSV, JSON</li>
                            <li>• Required: name, short name, color (hex code)</li>
                            <li>• Optional: logo url</li>
                            <li>• Color format: #RRGGBB (e.g., #FF0000 for red)</li>
                            <li>• Budget: {teamBudget} {currency} (auto-assigned)</li>
                        </ul>
                        <div className="flex gap-2 mt-3">
                            <Button variant="secondary" onClick={downloadSampleCSV} className="text-xs">
                                📥 Download Sample CSV
                            </Button>
                            <Button variant="secondary" onClick={downloadSampleJSON} className="text-xs">
                                📥 Download Sample JSON
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
                            {loading ? 'IMPORTING...' : '📤 IMPORT TEAMS'}
                        </Button>
                    </form>
                </Card>
            )}

            {showForm && (
                <Card className="p-6">
                    <h4 className="font-mono text-lg font-bold mb-4">ADD NEW TEAM</h4>
                    
                    {error && (
                        <div className="mb-4 p-3 border-3 border-red-500 bg-red-500/10">
                            <p className="font-mono text-sm text-red-500">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            label="Team Name"
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            placeholder="Mumbai Indians"
                        />

                        <Input
                            label="Short Name"
                            type="text"
                            value={formData.shortName}
                            onChange={(e) => setFormData({ ...formData, shortName: e.target.value.toUpperCase() })}
                            required
                            maxLength={5}
                            placeholder="MI"
                        />

                        <div>
                            <label className="font-mono text-sm uppercase tracking-wider mb-2 block">
                                Team Color
                            </label>
                            <div className="flex gap-4 items-center">
                                <input
                                    type="color"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    className="w-20 h-12 border-3 border-border"
                                />
                                <Input
                                    type="text"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    placeholder="#3B82F6"
                                    className="flex-1"
                                />
                            </div>
                        </div>

                        <Input
                            label="Logo URL (optional)"
                            type="url"
                            value={formData.logo}
                            onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                            placeholder="https://example.com/logo.png"
                        />

                        <div className="pt-4 flex gap-3">
                            <Button
                                type="submit"
                                variant="primary"
                                disabled={loading}
                                className="flex-1"
                            >
                                {loading ? 'CREATING...' : 'CREATE TEAM'}
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

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teams.map((team) => (
                    <Card 
                        key={team.id} 
                        className="p-4"
                        style={{ borderColor: team.color }}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h4 
                                    className="font-mono text-lg font-bold"
                                    style={{ color: team.color }}
                                >
                                    {team.shortName}
                                </h4>
                                <p className="font-mono text-sm text-muted">{team.name}</p>
                            </div>
                            {team.squadSize === 0 && (
                                <button
                                    onClick={() => handleDelete(team.id)}
                                    className="text-red-500 hover:text-red-700 font-mono text-sm"
                                >
                                    DELETE
                                </button>
                            )}
                        </div>
                        
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="font-mono text-muted">Budget:</span>
                                <span className="font-mono font-bold">
                                    {Number(team.budget).toFixed(2)} {currency}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="font-mono text-muted">Players:</span>
                                <span className="font-mono font-bold">{team.squadSize}</span>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {teams.length === 0 && !showForm && (
                <div className="text-center py-12">
                    <p className="font-mono text-muted">No teams added yet. Click "ADD TEAM" to get started.</p>
                </div>
            )}
        </div>
    );
}
