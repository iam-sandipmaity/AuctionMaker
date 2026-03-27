'use client';

import { useMemo, useState } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';

export interface PlayerCareerOption {
    id: string;
    name: string;
    role?: string;
    previousTeamShortName?: string | null;
}

interface PlayerCareerProfile {
    fullName: string;
    nationality: string;
    age: string;
    battingStyle: string;
    bowlingStyle: string;
    playingRole: string;
    iplTeams: Array<{
        name: string;
        years?: string | null;
    }>;
    summary: string;
    battingStats: Array<{
        format: 'Test' | 'ODI' | 'T20I' | 'IPL';
        matches: string;
        innings: string;
        runs: string;
        highest: string;
        average: string;
        strikeRate: string;
        hundreds: string;
        fifties: string;
    }>;
    bowlingStats: Array<{
        format: 'Test' | 'ODI' | 'T20I' | 'IPL';
        matches: string;
        innings: string;
        balls: string;
        runs: string;
        wickets: string;
        best: string;
        average: string;
        economy: string;
        strikeRate: string;
    }>;
    sourceUrl: string;
}

interface PlayerCareerPanelProps {
    players: PlayerCareerOption[];
}

export default function PlayerCareerPanel({ players }: PlayerCareerPanelProps) {
    const [selectedPlayerName, setSelectedPlayerName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [profile, setProfile] = useState<PlayerCareerProfile | null>(null);

    const sortedPlayers = useMemo(
        () => [...players].sort((left, right) => left.name.localeCompare(right.name)),
        [players]
    );

    const filteredPlayers = useMemo(() => {
        const normalizedQuery = selectedPlayerName.trim().toLowerCase();
        if (!normalizedQuery) {
            return sortedPlayers.slice(0, 8);
        }

        return sortedPlayers
            .filter((player) => player.name.toLowerCase().includes(normalizedQuery))
            .slice(0, 8);
    }, [selectedPlayerName, sortedPlayers]);

    const loadCareerProfile = async () => {
        if (!selectedPlayerName.trim()) return;

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/player-career', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerName: selectedPlayerName.trim() }),
            });
            const data = await response.json();

            if (!response.ok) {
                setProfile(null);
                setError(data.error || 'Failed to load player career data');
                return;
            }

            setProfile(data.data);
        } catch (requestError) {
            console.error('Failed to load player career profile:', requestError);
            setProfile(null);
            setError('Failed to load player career data');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card className="p-5 md:p-6">
                <div className="flex flex-col xl:flex-row xl:items-end gap-4">
                    <div className="flex-1">
                        <Input
                            label="Career Inquiry Player"
                            type="text"
                            value={selectedPlayerName}
                            onChange={(event) => setSelectedPlayerName(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    void loadCareerProfile();
                                }
                            }}
                            placeholder="Search any player name, like Virat Kohli or Sanju Samson"
                            className="p-3 border-2 border-border bg-background font-mono text-sm"
                            helpText="You can type any player name. Auction player matches appear below as quick suggestions."
                        />
                    </div>
                    <div className="xl:w-auto">
                        <Button variant="primary" onClick={() => void loadCareerProfile()} disabled={!selectedPlayerName.trim() || loading} className="w-full xl:w-auto">
                            {loading ? 'LOADING CAREER...' : 'LOAD CAREER PROFILE'}
                        </Button>
                    </div>
                </div>
                <div className="mt-4">
                    <p className="font-mono text-xs uppercase tracking-wider text-muted mb-2">Auction Player Suggestions</p>
                    <div className="flex flex-wrap gap-2">
                        {filteredPlayers.length === 0 ? (
                            <span className="font-mono text-xs text-muted">No auction player names match this search. You can still search any player manually.</span>
                        ) : (
                            filteredPlayers.map((player) => (
                                <button
                                    key={player.id}
                                    type="button"
                                    onClick={() => setSelectedPlayerName(player.name)}
                                    className="px-3 py-2 border-2 border-border bg-background hover:border-accent hover:bg-accent/5 text-left"
                                >
                                    <p className="font-mono text-sm font-bold">{player.name}</p>
                                    <p className="font-mono text-xs text-muted">
                                        {player.role || 'Role unavailable'}{player.previousTeamShortName ? ` | ${player.previousTeamShortName}` : ''}
                                    </p>
                                </button>
                            ))
                        )}
                    </div>
                </div>
                <p className="font-mono text-xs text-muted mt-3">
                    Served by our backend route using public Cricbuzz player sitemap and profile pages, not by Groq and not by a paid official cricket API.
                </p>
                <p className="font-mono text-xs text-muted mt-1">
                    IPL team year ranges are shown only if the source exposes them. This view will not invent missing years.
                </p>
            </Card>

            {error && (
                <Card className="p-5 border-red-500 bg-red-500/10">
                    <p className="font-mono text-sm text-red-500">{error}</p>
                </Card>
            )}

            {!profile ? (
                <Card className="p-6 md:p-8 text-center">
                    <h3 className="text-xl font-bold mb-3">No Player Career Loaded Yet</h3>
                    <p className="font-mono text-sm text-muted">
                        Search for any player and load the real career card here.
                    </p>
                </Card>
            ) : (
                <>
                    <Card className="p-5 md:p-6 border-accent bg-accent/5">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                            <div>
                                <h3 className="text-2xl md:text-3xl font-bold">{profile.fullName}</h3>
                                <p className="font-mono text-sm text-muted mt-2">
                                    Career profile view for this player
                                </p>
                            </div>
                            <a
                                href={profile.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-xs uppercase tracking-wider text-accent underline"
                            >
                                View Source
                            </a>
                        </div>
                    </Card>

                    <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4">
                        <Card className="p-4">
                            <p className="font-mono text-xs text-muted mb-1">NATIONALITY</p>
                            <p className="font-mono text-lg font-bold">{profile.nationality || 'Unavailable'}</p>
                        </Card>
                        <Card className="p-4">
                            <p className="font-mono text-xs text-muted mb-1">AGE</p>
                            <p className="font-mono text-lg font-bold">{profile.age || 'Unavailable'}</p>
                        </Card>
                        <Card className="p-4">
                            <p className="font-mono text-xs text-muted mb-1">BATTING STYLE</p>
                            <p className="font-mono text-lg font-bold">{profile.battingStyle || 'Unavailable'}</p>
                        </Card>
                        <Card className="p-4">
                            <p className="font-mono text-xs text-muted mb-1">BOWLING STYLE</p>
                            <p className="font-mono text-lg font-bold">{profile.bowlingStyle || 'Unavailable'}</p>
                        </Card>
                        <Card className="p-4">
                            <p className="font-mono text-xs text-muted mb-1">PLAYING ROLE</p>
                            <p className="font-mono text-lg font-bold">{profile.playingRole || 'Unavailable'}</p>
                        </Card>
                    </div>

                    <Card className="p-5 md:p-6">
                        <h3 className="text-xl font-bold mb-4">IPL TEAMS</h3>
                        {profile.iplTeams.length === 0 ? (
                            <p className="font-mono text-sm text-muted">No IPL team history was exposed by the source.</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {profile.iplTeams.map((team) => (
                                    <div key={team.name} className="px-3 py-2 border-2 border-border bg-background">
                                        <p className="font-mono text-sm font-bold">{team.name}</p>
                                        <p className="font-mono text-xs text-muted">{team.years || 'Years unavailable from source'}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    {profile.summary && (
                        <Card className="p-5 md:p-6">
                            <h3 className="text-xl font-bold mb-4">SHORT SUMMARY</h3>
                            <p className="font-mono text-sm whitespace-pre-wrap">{profile.summary}</p>
                        </Card>
                    )}

                    <Card className="p-5 md:p-6">
                        <h3 className="text-xl font-bold mb-4">BATTING CAREER STATS</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] border-collapse">
                                <thead>
                                    <tr className="border-b-2 border-border">
                                        <th className="text-left font-mono text-xs uppercase tracking-wider p-3">Format</th>
                                        <th className="text-left font-mono text-xs uppercase tracking-wider p-3">Mat</th>
                                        <th className="text-left font-mono text-xs uppercase tracking-wider p-3">Inns</th>
                                        <th className="text-left font-mono text-xs uppercase tracking-wider p-3">Runs</th>
                                        <th className="text-left font-mono text-xs uppercase tracking-wider p-3">HS</th>
                                        <th className="text-left font-mono text-xs uppercase tracking-wider p-3">Ave</th>
                                        <th className="text-left font-mono text-xs uppercase tracking-wider p-3">SR</th>
                                        <th className="text-left font-mono text-xs uppercase tracking-wider p-3">100s</th>
                                        <th className="text-left font-mono text-xs uppercase tracking-wider p-3">50s</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {profile.battingStats.map((stat) => (
                                        <tr key={stat.format} className="border-b border-border/60">
                                            <td className="p-3 font-mono font-bold">{stat.format}</td>
                                            <td className="p-3 font-mono text-sm">{stat.matches}</td>
                                            <td className="p-3 font-mono text-sm">{stat.innings}</td>
                                            <td className="p-3 font-mono text-sm">{stat.runs}</td>
                                            <td className="p-3 font-mono text-sm">{stat.highest}</td>
                                            <td className="p-3 font-mono text-sm">{stat.average}</td>
                                            <td className="p-3 font-mono text-sm">{stat.strikeRate}</td>
                                            <td className="p-3 font-mono text-sm">{stat.hundreds}</td>
                                            <td className="p-3 font-mono text-sm">{stat.fifties}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    <Card className="p-5 md:p-6">
                        <h3 className="text-xl font-bold mb-4">BOWLING CAREER STATS</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] border-collapse">
                                <thead>
                                    <tr className="border-b-2 border-border">
                                        <th className="text-left font-mono text-xs uppercase tracking-wider p-3">Format</th>
                                        <th className="text-left font-mono text-xs uppercase tracking-wider p-3">Mat</th>
                                        <th className="text-left font-mono text-xs uppercase tracking-wider p-3">Inns</th>
                                        <th className="text-left font-mono text-xs uppercase tracking-wider p-3">Balls</th>
                                        <th className="text-left font-mono text-xs uppercase tracking-wider p-3">Runs</th>
                                        <th className="text-left font-mono text-xs uppercase tracking-wider p-3">Wkts</th>
                                        <th className="text-left font-mono text-xs uppercase tracking-wider p-3">Best</th>
                                        <th className="text-left font-mono text-xs uppercase tracking-wider p-3">Ave</th>
                                        <th className="text-left font-mono text-xs uppercase tracking-wider p-3">Econ</th>
                                        <th className="text-left font-mono text-xs uppercase tracking-wider p-3">SR</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {profile.bowlingStats.map((stat) => (
                                        <tr key={stat.format} className="border-b border-border/60">
                                            <td className="p-3 font-mono font-bold">{stat.format}</td>
                                            <td className="p-3 font-mono text-sm">{stat.matches}</td>
                                            <td className="p-3 font-mono text-sm">{stat.innings}</td>
                                            <td className="p-3 font-mono text-sm">{stat.balls}</td>
                                            <td className="p-3 font-mono text-sm">{stat.runs}</td>
                                            <td className="p-3 font-mono text-sm">{stat.wickets}</td>
                                            <td className="p-3 font-mono text-sm">{stat.best}</td>
                                            <td className="p-3 font-mono text-sm">{stat.average}</td>
                                            <td className="p-3 font-mono text-sm">{stat.economy}</td>
                                            <td className="p-3 font-mono text-sm">{stat.strikeRate}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
}
