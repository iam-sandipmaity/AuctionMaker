'use client';

import { useEffect, useState } from 'react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { useToast } from '@/components/ui/ToastProvider';
import PlayerCareerPanel, { PlayerCareerOption } from '@/components/auction/PlayerCareerPanel';

interface Team {
    id: string;
    name: string;
    shortName: string;
    color: string;
    budget: number;
    totalBudget: number;
    squadSize: number;
    rtmCardsRemaining: number;
}

interface AiAnalyzerPanelProps {
    auctionId: string;
    auction: {
        title: string;
        currency: string;
        budgetDenomination?: string;
    };
    teams: Team[];
    players: PlayerCareerOption[];
    userTeamId?: string | null;
}

interface ChatMessage {
    role: 'assistant' | 'user';
    text: string;
}

interface AnalysisState {
    answer: string;
    bestXi: Array<{
        slot: string;
        name: string;
        role: string;
        status: 'owned' | 'target';
        reason: string;
    }>;
    backups: Array<{
        name: string;
        role: string;
        reason: string;
    }>;
    weaknesses: string[];
    targets: Array<{
        name: string;
        role: string;
        reason: string;
    }>;
    budgetStrategy: string;
    comparisonSummary?: string;
}

const GROQ_STORAGE_KEY = 'auctionmaker.groq_api_key';

const QUICK_PROMPTS = [
    'Which team looks strongest right now?',
    'Build the best playing XI and backups for this team',
    'What are this team\'s weak areas?',
    'Suggest next auction targets for this squad',
    'Compare these two teams',
    'What should be the budget strategy now?',
];

function sanitizeChatMessages(messages: ChatMessage[]) {
    return messages
        .map((message) => ({
            ...message,
            text: message.text.trim(),
        }))
        .filter((message) => message.text.length > 0);
}

export default function AiAnalyzerPanel({ auctionId, auction, teams, players, userTeamId }: AiAnalyzerPanelProps) {
    const { showToast } = useToast();
    const [mode, setMode] = useState<'team' | 'player'>('team');
    const [selectedTeamId, setSelectedTeamId] = useState('');
    const [comparisonTeamId, setComparisonTeamId] = useState('');
    const [teamBuildPreference, setTeamBuildPreference] = useState<'balanced' | 'batting_heavy' | 'bowling_heavy' | 'all_rounder_heavy'>('balanced');
    const [pitchType, setPitchType] = useState<'balanced' | 'batting_friendly' | 'pace_friendly' | 'spin_friendly'>('balanced');
    const [dewFactor, setDewFactor] = useState<'unknown' | 'yes' | 'no'>('unknown');
    const [chatInput, setChatInput] = useState('');
    const [showGroqModal, setShowGroqModal] = useState(false);
    const [groqApiKey, setGroqApiKey] = useState('');
    const [pendingGroqApiKey, setPendingGroqApiKey] = useState('');
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const [analysisError, setAnalysisError] = useState('');
    const [analysis, setAnalysis] = useState<AnalysisState | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'assistant',
            text: 'Ask about any team in this auction. Add your Groq API key if you want to use your own quota.',
        },
    ]);

    useEffect(() => {
        const savedKey = window.localStorage.getItem(GROQ_STORAGE_KEY) || '';
        setGroqApiKey(savedKey);
        setPendingGroqApiKey(savedKey);
    }, []);

    useEffect(() => {
        if (selectedTeamId) return;
        if (userTeamId && teams.some((team) => team.id === userTeamId)) {
            setSelectedTeamId(userTeamId);
            return;
        }
        if (teams[0]) {
            setSelectedTeamId(teams[0].id);
        }
    }, [selectedTeamId, teams, userTeamId]);

    const selectedTeam = teams.find((team) => team.id === selectedTeamId) || null;
    const comparisonTeam = teams.find((team) => team.id === comparisonTeamId) || null;

    const saveGroqKey = () => {
        window.localStorage.setItem(GROQ_STORAGE_KEY, pendingGroqApiKey.trim());
        setGroqApiKey(pendingGroqApiKey.trim());
        setShowGroqModal(false);
        showToast(pendingGroqApiKey.trim() ? 'Groq API key saved locally' : 'Groq API key cleared', 'success');
    };

    const removeGroqKey = () => {
        window.localStorage.removeItem(GROQ_STORAGE_KEY);
        setGroqApiKey('');
        setPendingGroqApiKey('');
        showToast('Groq API key removed from this browser', 'success');
    };

    const runAnalysis = async (prompt: string, nextMessages: ChatMessage[]) => {
        if (!selectedTeam) {
            setMessages((prev) => [...prev, { role: 'assistant', text: 'Select a team first so I know what to analyze.' }]);
            return;
        }

        setAnalysisLoading(true);
        setAnalysisError('');

        try {
            const response = await fetch('/api/ai-analyzer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    auctionId,
                    selectedTeamId,
                    comparisonTeamId: comparisonTeamId || undefined,
                    teamBuildPreference,
                    pitchType,
                    dewFactor,
                    question: prompt,
                    messages: sanitizeChatMessages(nextMessages).slice(-8),
                    groqApiKey: groqApiKey || undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setAnalysisError(data.error || 'Failed to analyze this auction');
                setMessages((prev) => [...prev, { role: 'assistant', text: data.error || 'Failed to analyze this auction.' }]);
                return;
            }

            const nextAnalysis = data.data as AnalysisState;
            const answerText = nextAnalysis.answer?.trim() || 'Here is the latest analysis for this squad.';
            setAnalysis(nextAnalysis);
            setMessages((prev) => [...prev, { role: 'assistant', text: answerText }]);
        } catch (error) {
            console.error('AI analyzer request failed:', error);
            const message = 'Failed to reach the AI analyzer.';
            setAnalysisError(message);
            setMessages((prev) => [...prev, { role: 'assistant', text: message }]);
        } finally {
            setAnalysisLoading(false);
        }
    };

    const sendPrompt = async (prompt: string) => {
        const trimmedPrompt = prompt.trim();
        if (!trimmedPrompt) return;

        const nextMessages = sanitizeChatMessages([...messages, { role: 'user' as const, text: trimmedPrompt }]);
        setMessages(nextMessages);
        await runAnalysis(trimmedPrompt, nextMessages);
    };

    const submitChat = async () => {
        const prompt = chatInput.trim();
        if (!prompt) return;
        setChatInput('');
        await sendPrompt(prompt);
    };

    return (
        <div className="space-y-6 px-4 md:px-0">
            <Card className="p-5 md:p-6 border-accent bg-accent/5">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge status="live">AI ANALYZER</Badge>
                            <Badge status={groqApiKey ? 'active' : 'upcoming'}>
                                {groqApiKey ? 'GROQ KEY READY' : 'OPTIONAL API KEY'}
                            </Badge>
                        </div>
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold">Auction Insights and Player Career Finder</h2>
                            <p className="font-mono text-sm text-muted mt-2">
                                Use team analysis for auction strategy and player career for real cricketer profile data.
                            </p>
                        </div>
                    </div>
                    <Button variant="secondary" onClick={() => setShowGroqModal(true)}>
                        {groqApiKey ? 'MANAGE GROQ KEY' : 'ADD GROQ API KEY'}
                    </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                    <Button variant={mode === 'team' ? 'primary' : 'secondary'} onClick={() => setMode('team')}>
                        TEAM ANALYSIS
                    </Button>
                    <Button variant={mode === 'player' ? 'primary' : 'secondary'} onClick={() => setMode('player')}>
                        PLAYER CAREER
                    </Button>
                </div>
            </Card>

            {mode === 'team' ? (
                <>
                    <Card className="p-5 md:p-6">
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="font-mono text-xs uppercase tracking-wider mb-2 block">Primary Team</label>
                        <select
                            value={selectedTeamId}
                            onChange={(e) => setSelectedTeamId(e.target.value)}
                            className="w-full p-3 border-2 border-border bg-background font-mono text-sm"
                        >
                            <option value="">Select team</option>
                            {teams.map((team) => (
                                <option key={team.id} value={team.id}>
                                    {team.shortName} - {team.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="font-mono text-xs uppercase tracking-wider mb-2 block">Compare With</label>
                        <select
                            value={comparisonTeamId}
                            onChange={(e) => setComparisonTeamId(e.target.value)}
                            className="w-full p-3 border-2 border-border bg-background font-mono text-sm"
                        >
                            <option value="">No comparison</option>
                            {teams.filter((team) => team.id !== selectedTeamId).map((team) => (
                                <option key={team.id} value={team.id}>
                                    {team.shortName} - {team.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4 mt-4">
                    <div>
                        <label className="font-mono text-xs uppercase tracking-wider mb-2 block">Team Build</label>
                        <select
                            value={teamBuildPreference}
                            onChange={(e) => setTeamBuildPreference(e.target.value as 'balanced' | 'batting_heavy' | 'bowling_heavy' | 'all_rounder_heavy')}
                            className="w-full p-3 border-2 border-border bg-background font-mono text-sm"
                        >
                            <option value="balanced">Balanced</option>
                            <option value="batting_heavy">Batting Heavy</option>
                            <option value="bowling_heavy">Bowling Heavy</option>
                            <option value="all_rounder_heavy">All-rounder Heavy</option>
                        </select>
                    </div>
                    <div>
                        <label className="font-mono text-xs uppercase tracking-wider mb-2 block">Pitch Type</label>
                        <select
                            value={pitchType}
                            onChange={(e) => setPitchType(e.target.value as 'balanced' | 'batting_friendly' | 'pace_friendly' | 'spin_friendly')}
                            className="w-full p-3 border-2 border-border bg-background font-mono text-sm"
                        >
                            <option value="balanced">Balanced</option>
                            <option value="batting_friendly">Batting Friendly</option>
                            <option value="pace_friendly">Pace Friendly</option>
                            <option value="spin_friendly">Spin Friendly</option>
                        </select>
                    </div>
                    <div>
                        <label className="font-mono text-xs uppercase tracking-wider mb-2 block">Dew Factor</label>
                        <select
                            value={dewFactor}
                            onChange={(e) => setDewFactor(e.target.value as 'unknown' | 'yes' | 'no')}
                            className="w-full p-3 border-2 border-border bg-background font-mono text-sm"
                        >
                            <option value="unknown">Unknown</option>
                            <option value="yes">Expected</option>
                            <option value="no">Not Expected</option>
                        </select>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                    {QUICK_PROMPTS.map((prompt) => (
                        <Button
                            key={prompt}
                            variant="secondary"
                            className="text-xs"
                            onClick={() => void sendPrompt(prompt)}
                            disabled={analysisLoading}
                        >
                            {prompt.toUpperCase()}
                        </Button>
                    ))}
                </div>
                {(selectedTeam || comparisonTeam) && (
                    <div className="mt-4 flex flex-wrap gap-3 font-mono text-sm text-muted">
                        {selectedTeam && <span>Focus: <span className="font-bold" style={{ color: selectedTeam.color }}>{selectedTeam.shortName}</span></span>}
                        {comparisonTeam && <span>Compare: <span className="font-bold" style={{ color: comparisonTeam.color }}>{comparisonTeam.shortName}</span></span>}
                        <span>Style: <span className="font-bold">{teamBuildPreference.replace(/_/g, ' ')}</span></span>
                        <span>Pitch: <span className="font-bold">{pitchType.replace(/_/g, ' ')}</span></span>
                        <span>Dew: <span className="font-bold">{dewFactor}</span></span>
                    </div>
                )}
                    </Card>

                    <div className="grid xl:grid-cols-5 gap-6">
                <div className="xl:col-span-2">
                    <Card className="p-5 md:p-6 h-full">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-xl font-bold">ANALYZER CHAT</h3>
                                <p className="font-mono text-xs text-muted mt-1">
                                    Ask strategy questions, comparison questions, or playing XI questions. For full player career data, switch to Player Career.
                                </p>
                            </div>
                            <Badge status={analysisLoading ? 'live' : 'active'}>
                                {analysisLoading ? 'ANALYZING' : 'READY'}
                            </Badge>
                        </div>

                        {analysisError && (
                            <div className="mb-4 p-3 border-2 border-red-500 bg-red-500/10">
                                <p className="font-mono text-sm text-red-500">{analysisError}</p>
                            </div>
                        )}

                        <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                            {messages.map((message, index) => (
                                <div
                                    key={`${message.role}-${index}`}
                                    className={`p-4 border-2 ${message.role === 'assistant' ? 'border-accent/30 bg-accent/5' : 'border-border bg-background'}`}
                                >
                                    <p className="font-mono text-xs uppercase tracking-wider text-muted mb-2">
                                        {message.role === 'assistant' ? 'AI Analyzer' : 'You'}
                                    </p>
                                    <p className="font-mono text-sm whitespace-pre-wrap">{message.text}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 flex flex-col sm:flex-row gap-3">
                            <div className="flex-1">
                                <Input
                                    label="Ask About This Auction"
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder="Which team looks stronger, best XI for MI, compare MI vs CSK..."
                                />
                            </div>
                            <div className="sm:self-end">
                                <Button variant="primary" onClick={() => void submitChat()} className="w-full sm:w-auto" disabled={analysisLoading}>
                                    {analysisLoading ? 'ANALYZING...' : 'SEND'}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="xl:col-span-3 space-y-6">
                    {!analysis ? (
                        <Card className="p-6 md:p-8 text-center">
                            <h3 className="text-xl font-bold mb-3">No Analysis Yet</h3>
                                <p className="font-mono text-sm text-muted">
                                    Choose a team and send a question. The analyzer will show only actual AI results here.
                                </p>
                        </Card>
                    ) : (
                        <>
                            <Card className="p-5 md:p-6">
                                <h3 className="text-xl font-bold mb-4">AI SUMMARY</h3>
                                <p className="font-mono text-sm whitespace-pre-wrap">{analysis.answer}</p>
                            </Card>

                            {analysis.bestXi.length > 0 && (
                                <Card className="p-5 md:p-6">
                                    <h3 className="text-xl font-bold mb-4">BEST PLAYING XI</h3>
                                    <div className="space-y-2">
                                        {analysis.bestXi.map((player, index) => (
                                            <div
                                                key={`${player.slot}-${player.name}-${index}`}
                                                className={`p-3 border-2 ${player.status === 'target' ? 'border-amber-500 bg-amber-500/10' : 'border-green-500 bg-green-500/10'}`}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="font-mono text-xs uppercase tracking-wider text-muted mb-1">{player.slot}</p>
                                                        <p className="font-mono font-bold">#{index + 1} {player.name}</p>
                                                        <p className="font-mono text-xs text-muted">{player.role}</p>
                                                    </div>
                                                    <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-1 border ${player.status === 'target' ? 'border-amber-500 text-amber-600' : 'border-green-500 text-green-600'}`}>
                                                        {player.status === 'target' ? 'Target Pick' : 'Owned Player'}
                                                    </span>
                                                </div>
                                                <p className="font-mono text-xs text-muted mt-2">{player.reason}</p>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}

                            {analysis.backups.length > 0 && (
                                <Card className="p-5 md:p-6">
                                    <h3 className="text-xl font-bold mb-4">BACKUP OPTIONS</h3>
                                    <div className="space-y-2">
                                        {analysis.backups.map((player, index) => (
                                            <div key={`${player.name}-${index}`} className="p-3 border-2 border-border">
                                                <p className="font-mono font-bold">{player.name}</p>
                                                <p className="font-mono text-xs text-muted mt-1">{player.role}</p>
                                                <p className="font-mono text-xs text-muted mt-2">{player.reason}</p>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}

                            {analysis.weaknesses.length > 0 && (
                                <Card className="p-5 md:p-6">
                                    <h3 className="text-xl font-bold mb-4">WEAK AREAS</h3>
                                    <div className="space-y-2">
                                        {analysis.weaknesses.map((item) => (
                                            <div key={item} className="p-3 border-2 border-border font-mono text-sm">
                                                {item}
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}

                            {analysis.targets.length > 0 && (
                                <Card className="p-5 md:p-6">
                                    <h3 className="text-xl font-bold mb-4">SUGGESTED TARGETS</h3>
                                    <div className="space-y-2">
                                        {analysis.targets.map((player, index) => (
                                            <div key={`${player.name}-${index}`} className="p-3 border-2 border-border">
                                                <p className="font-mono font-bold">{player.name}</p>
                                                <p className="font-mono text-xs text-muted mt-1">{player.role}</p>
                                                <p className="font-mono text-xs text-muted mt-2">{player.reason}</p>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}

                            {analysis.budgetStrategy && (
                                <Card className="p-5 md:p-6">
                                    <h3 className="text-xl font-bold mb-4">BUDGET STRATEGY</h3>
                                    <p className="font-mono text-sm whitespace-pre-wrap">{analysis.budgetStrategy}</p>
                                </Card>
                            )}

                            {analysis.comparisonSummary && (
                                <Card className="p-5 md:p-6">
                                    <h3 className="text-xl font-bold mb-4">COMPARISON SUMMARY</h3>
                                    <p className="font-mono text-sm whitespace-pre-wrap">{analysis.comparisonSummary}</p>
                                </Card>
                            )}
                        </>
                    )}
                </div>
                    </div>
                </>
            ) : (
                <PlayerCareerPanel players={players} />
            )}

            {showGroqModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setShowGroqModal(false)}>
                    <Card className="max-w-xl w-full p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between gap-4 mb-6">
                            <div>
                                <h3 className="text-2xl font-bold">Groq API Key</h3>
                                <p className="font-mono text-sm text-muted mt-2">
                                    Optional. If you add your own key, analysis uses your Groq quota from this browser.
                                </p>
                            </div>
                            <Button variant="secondary" onClick={() => setShowGroqModal(false)}>
                                CLOSE
                            </Button>
                        </div>
                        <div className="space-y-4">
                            <Input
                                label="Groq API Key"
                                type="password"
                                value={pendingGroqApiKey}
                                onChange={(e) => setPendingGroqApiKey(e.target.value)}
                                placeholder="gsk_..."
                            />
                            <p className="font-mono text-xs text-muted">
                                Stored only in this browser. If you leave it empty, the server fallback key will be used if configured.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button variant="primary" onClick={saveGroqKey} className="flex-1">
                                    SAVE KEY
                                </Button>
                                <Button variant="secondary" onClick={removeGroqKey} className="flex-1">
                                    REMOVE KEY
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
