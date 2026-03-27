import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db/prisma';
import { fetchPlayerCareerProfile } from '@/lib/auction/playerCareer';

const analyzerRequestSchema = z.object({
    auctionId: z.string(),
    selectedTeamId: z.string(),
    comparisonTeamId: z.string().optional().nullable(),
    question: z.string().min(2),
    teamBuildPreference: z.enum(['balanced', 'batting_heavy', 'bowling_heavy', 'all_rounder_heavy']).optional(),
    pitchType: z.enum(['balanced', 'batting_friendly', 'pace_friendly', 'spin_friendly']).optional(),
    dewFactor: z.enum(['unknown', 'yes', 'no']).optional(),
    messages: z.array(
        z.object({
            role: z.enum(['user', 'assistant']),
            text: z.string().min(1),
        })
    ).max(12).optional(),
    groqApiKey: z.string().optional(),
});

function sanitizeAnalyzerRequestBody(body: unknown) {
    if (!body || typeof body !== 'object') {
        return body;
    }

    const nextBody = { ...(body as Record<string, unknown>) };

    if (Array.isArray(nextBody.messages)) {
        nextBody.messages = nextBody.messages
            .filter((message): message is { role: unknown; text: unknown } => Boolean(message) && typeof message === 'object')
            .map((message) => ({
                role: message.role,
                text: typeof message.text === 'string' ? message.text.trim() : message.text,
            }))
            .filter((message) => typeof message.text === 'string' && message.text.length > 0);
    }

    if (typeof nextBody.question === 'string') {
        nextBody.question = nextBody.question.trim();
    }

    if (typeof nextBody.groqApiKey === 'string') {
        nextBody.groqApiKey = nextBody.groqApiKey.trim();
    }

    return nextBody;
}

type AnalyzerOutput = {
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
};

type AnalyzerXiEntry = {
    slot: string;
    name: string;
    role: string;
    status: 'owned' | 'target';
    reason: string;
};

type AnalyzerNamedSuggestion = {
    name: string;
    role: string;
    reason: string;
};

const PROJECTED_XI_SLOTS = [
    'Opener 1',
    'Opener 2',
    'No. 3',
    'No. 4',
    'No. 5',
    'Wicketkeeper / Finisher',
    'Batting All-rounder',
    'Bowling All-rounder',
    'Spin Bowler',
    'Pace Bowler 1',
    'Pace Bowler 2',
] as const;

const TEAM_BIAS_PROFILES: Record<string, { identity: string; squadBuildNotes: string[]; targetBias: string[] }> = {
    MI: {
        identity: 'Mumbai Indians usually favor explosive top-six batting, flexible middle-order power, elite death bowling, and high-upside match-winners.',
        squadBuildNotes: [
            'Prefer genuine openers at the top rather than pushing middle-order batters to open.',
            'Keep high-impact middle-order hitters in the middle overs.',
            'Preserve specialist strike bowlers for the final bowling slots.',
        ],
        targetBias: ['Strong openers', 'Death-over pacers', 'Power finishers', 'Athletic all-rounders'],
    },
    CSK: {
        identity: 'Chennai Super Kings usually prefer role clarity, stability, spin support, and experienced finishers.',
        squadBuildNotes: [
            'Value role certainty over chaos picks.',
            'Keep the XI calm and balanced.',
            'Use spin and all-round depth intelligently.',
        ],
        targetBias: ['Reliable batters', 'Utility all-rounders', 'Spin options', 'Finishers'],
    },
    RCB: {
        identity: 'Royal Challengers Bengaluru usually benefit from top-order run-making, power batting, and bowlers who can survive flat decks.',
        squadBuildNotes: [
            'Do not overload only the top order.',
            'Protect late-order bowling specialists.',
            'Support the core batters with finishers and strike bowlers.',
        ],
        targetBias: ['Top-order batters', 'Finishers', 'Powerplay bowlers', 'Death bowlers'],
    },
    KKR: {
        identity: 'Kolkata Knight Riders often work best with flexible all-round depth, middle-order power, and strong spin options.',
        squadBuildNotes: [
            'Value multi-skill players heavily.',
            'Keep spin in the team identity.',
            'Use floaters in the middle order rather than fixed accumulators only.',
        ],
        targetBias: ['Spin-bowling all-rounders', 'Power hitters', 'Mystery spin', 'Flexible seamers'],
    },
    SRH: {
        identity: 'Sunrisers Hyderabad often benefit from aggressive top-order batting and fast bowlers who can take wickets in bursts.',
        squadBuildNotes: [
            'Prioritize attack-minded openers.',
            'Use specialist pacers late in the XI.',
            'Avoid passive batting groups.',
        ],
        targetBias: ['Aggressive openers', 'Strike pacers', 'Middle-order hitters', 'Seam all-rounders'],
    },
    RR: {
        identity: 'Rajasthan Royals often suit fluent top-order batting, adaptable finishers, and varied bowling options.',
        squadBuildNotes: [
            'Top-order role clarity matters.',
            'Balance batting phases properly.',
            'Use variation in both pace and spin resources.',
        ],
        targetBias: ['Openers', 'Middle-order support', 'Leg-spin', 'Variation pacers'],
    },
    DC: {
        identity: 'Delhi Capitals often gain from athletic, high-ceiling squads with intent batting and pace strength.',
        squadBuildNotes: [
            'Favor high-upside and dynamic skill sets.',
            'Separate powerplay and death bowling roles.',
            'Keep the batting order from becoming one-paced.',
        ],
        targetBias: ['Dynamic batters', 'Fast bowlers', 'Finishers', 'All-round depth'],
    },
    PBKS: {
        identity: 'Punjab Kings usually need more structure, balance, and role discipline than a random collection of firepower.',
        squadBuildNotes: [
            'Avoid building only for six-hitting.',
            'Prioritize bowling control and batting role clarity.',
            'Separate anchors, hitters, and finishers properly.',
        ],
        targetBias: ['Structured batters', 'Reliable bowlers', 'Finishers', 'Balanced all-rounders'],
    },
    GT: {
        identity: 'Gujarat Titans usually fit pragmatic, well-balanced XIs with strong pace and role-flexible batting.',
        squadBuildNotes: [
            'Favor complete balance over extremes.',
            'Use all-rounders to connect phases of the game.',
            'Keep strike bowlers in specialist late batting slots.',
        ],
        targetBias: ['Balanced all-rounders', 'Pace bowlers', 'Flexible batters', 'Control options'],
    },
    LSG: {
        identity: 'Lucknow Super Giants usually benefit from deep batting, adaptable role players, and multi-phase bowling groups.',
        squadBuildNotes: [
            'Keep batting deep without losing wicket-taking quality.',
            'Prefer utility players who cover multiple phases.',
            'Balance top-order stability with finishing power.',
        ],
        targetBias: ['Top-order support', 'Utility all-rounders', 'Phase bowlers', 'Finishers'],
    },
};

type AnalyzerPlayerIntel = {
    name: string;
    auctionRole: string;
    nationality: string;
    age: string;
    playingRole: string;
    battingStyle: string;
    bowlingStyle: string;
    iplTeams: string[];
    summary: string;
    t20iBatting?: {
        matches: string;
        runs: string;
        average: string;
        strikeRate: string;
        hundreds: string;
        fifties: string;
    };
    iplBatting?: {
        matches: string;
        runs: string;
        average: string;
        strikeRate: string;
        hundreds: string;
        fifties: string;
    };
    t20iBowling?: {
        wickets: string;
        average: string;
        economy: string;
        strikeRate: string;
        best: string;
    };
    iplBowling?: {
        wickets: string;
        average: string;
        economy: string;
        strikeRate: string;
        best: string;
    };
    slotGuidance: {
        preferredSlots: string[];
        avoidSlots: string[];
        battingRole: string;
        bowlingRole: string;
        keeper: boolean;
    };
};

type AnalyzerPlayerSlotGuidance = AnalyzerPlayerIntel['slotGuidance'];

type AnalyzerIntent =
    | 'greeting'
    | 'playing_xi'
    | 'weakness'
    | 'targets'
    | 'comparison'
    | 'budget'
    | 'strength'
    | 'general';

function extractJsonObject(content: string) {
    try {
        return JSON.parse(content);
    } catch {
        const start = content.indexOf('{');
        const end = content.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return JSON.parse(content.slice(start, end + 1));
        }
        throw new Error('Model did not return valid JSON');
    }
}

function guidanceForName(name: string, playerGuidanceMap: Map<string, AnalyzerPlayerSlotGuidance>) {
    return playerGuidanceMap.get(name.toLowerCase()) || null;
}

function dedupeNamedEntries<T extends { name: string }>(entries: T[]) {
    const seen = new Set<string>();
    return entries.filter((entry) => {
        const normalized = entry.name.trim().toLowerCase();
        if (!normalized || seen.has(normalized)) {
            return false;
        }
        seen.add(normalized);
        return true;
    });
}

function scorePlayerForSlot(
    slot: string,
    entry: { slot: string; name: string; role: string; status: 'owned' | 'target'; reason: string },
    playerGuidanceMap: Map<string, AnalyzerPlayerSlotGuidance>
) {
    const guidance = guidanceForName(entry.name, playerGuidanceMap);
    if (!guidance) {
        return entry.slot === slot ? 4 : 0;
    }

    const preferredIndex = guidance.preferredSlots.indexOf(slot);
    if (preferredIndex >= 0) {
        return 100 - preferredIndex * 10 + (entry.status === 'owned' ? 2 : 0);
    }

    if (guidance.avoidSlots.includes(slot)) {
        return -100;
    }

    if (entry.slot === slot) {
        return 6;
    }

    return 1;
}

function rebalanceProjectedXi(
    entries: Array<{ slot: string; name: string; role: string; status: 'owned' | 'target'; reason: string }>,
    playerGuidanceMap: Map<string, AnalyzerPlayerSlotGuidance>
) {
    const remaining = [...entries];
    const rebalanced: Array<{ slot: string; name: string; role: string; status: 'owned' | 'target'; reason: string }> = [];

    for (const slot of PROJECTED_XI_SLOTS) {
        let bestIndex = -1;
        let bestScore = Number.NEGATIVE_INFINITY;

        remaining.forEach((entry, index) => {
            const score = scorePlayerForSlot(slot, entry, playerGuidanceMap);
            if (score > bestScore) {
                bestScore = score;
                bestIndex = index;
            }
        });

        if (bestIndex >= 0) {
            const [chosen] = remaining.splice(bestIndex, 1);
            rebalanced.push({
                ...chosen,
                slot,
            });
        }
    }

    return rebalanced;
}

function sanitizeAnalysis(
    parsed: any,
    intent: AnalyzerIntent,
    question: string,
    currentSquadNames: Set<string>,
    availablePlayerNames: Set<string>,
    playerGuidanceMap: Map<string, AnalyzerPlayerSlotGuidance>
): AnalyzerOutput {
    const normalizedQuestion = question.trim().toLowerCase();
    const shouldBuildXi = intent === 'playing_xi'
        || /(build|make|create|arrange|set|pick).*(xi|11|eleven|lineup|team)/.test(normalizedQuestion)
        || /(best xi|best playing xi|playing xi|playing 11|playing eleven|proper 11|probable xi|starting xi|full xi|full 11|backups?)/.test(normalizedQuestion);
    const shouldShowWeaknesses = intent === 'weakness';
    const shouldShowTargets = intent === 'targets' || shouldBuildXi;
    const shouldShowBudget = intent === 'budget';
    const shouldShowComparison = intent === 'comparison';

    const rawTargets: AnalyzerNamedSuggestion[] = dedupeNamedEntries<AnalyzerNamedSuggestion>(Array.isArray(parsed?.targets)
        ? parsed.targets.slice(0, 8).map((item: any) => ({
            name: typeof item?.name === 'string' ? item.name : 'Unknown Target',
            role: typeof item?.role === 'string' ? item.role : 'Unknown Role',
            reason: typeof item?.reason === 'string' ? item.reason : 'Suggested by AI analysis',
        }))
        : []);

    const rawBackups: AnalyzerNamedSuggestion[] = dedupeNamedEntries<AnalyzerNamedSuggestion>(Array.isArray(parsed?.backups)
        ? parsed.backups.slice(0, 10).map((item: any) => ({
            name: typeof item?.name === 'string' ? item.name : 'Unknown Backup',
            role: typeof item?.role === 'string' ? item.role : 'Unknown Role',
            reason: typeof item?.reason === 'string' ? item.reason : 'Suggested as a backup option',
        }))
        : []);

    const normalizedBestXi: AnalyzerXiEntry[] = dedupeNamedEntries<AnalyzerXiEntry>(Array.isArray(parsed?.bestXi)
        ? parsed.bestXi.slice(0, 11).map((item: any, index: number) => {
            const name = typeof item?.name === 'string' ? item.name : 'Unknown Player';
            const normalizedName = name.toLowerCase();
            const inferredStatus = currentSquadNames.has(normalizedName)
                ? 'owned'
                : availablePlayerNames.has(normalizedName)
                    ? 'target'
                    : 'target';

            return {
                slot: typeof item?.slot === 'string' && item.slot.trim() ? item.slot : PROJECTED_XI_SLOTS[index],
                name,
                role: typeof item?.role === 'string' ? item.role : 'Unknown Role',
                status: item?.status === 'owned' || item?.status === 'target' ? item.status : inferredStatus,
                reason: typeof item?.reason === 'string' ? item.reason : 'Suggested by AI analysis',
            };
        })
        : []);
    const rebalancedBestXi = shouldBuildXi
        ? (() => {
            const usedXiNames = new Set(normalizedBestXi.map((item: { name: string }) => item.name.toLowerCase()));
            const fillerCandidates: AnalyzerNamedSuggestion[] = dedupeNamedEntries<AnalyzerNamedSuggestion>([
                ...rawTargets,
                ...rawBackups,
            ]).filter((candidate: { name: string }) => !usedXiNames.has(candidate.name.toLowerCase()));
            const completedBestXi: AnalyzerXiEntry[] = [...normalizedBestXi];

            while (completedBestXi.length < PROJECTED_XI_SLOTS.length && fillerCandidates.length > 0) {
                const filler = fillerCandidates.shift()!;
                completedBestXi.push({
                    slot: PROJECTED_XI_SLOTS[completedBestXi.length],
                    name: filler.name,
                    role: filler.role,
                    status: 'target',
                    reason: filler.reason,
                });
            }

            while (completedBestXi.length < PROJECTED_XI_SLOTS.length) {
                completedBestXi.push({
                    slot: PROJECTED_XI_SLOTS[completedBestXi.length],
                    name: 'Target Needed',
                    role: 'Role to be filled',
                    status: 'target',
                    reason: 'No suitable filled slot was returned, so this role still needs an auction target.',
                });
            }

            return rebalanceProjectedXi(completedBestXi, playerGuidanceMap);
        })()
        : [];

    return {
        answer: typeof parsed?.answer === 'string' ? parsed.answer : 'No analysis returned.',
        bestXi: rebalancedBestXi,
        backups: shouldBuildXi
            ? rawBackups
            .filter((item) => !rebalancedBestXi.some((xiPlayer) => xiPlayer.name.toLowerCase() === item.name.toLowerCase()))
            .slice(0, 8)
            : [],
        weaknesses: shouldShowWeaknesses && Array.isArray(parsed?.weaknesses)
            ? parsed.weaknesses.filter((item: unknown) => typeof item === 'string').slice(0, 6)
            : [],
        targets: shouldShowTargets ? rawTargets.slice(0, 6) : [],
        budgetStrategy: shouldShowBudget && typeof parsed?.budgetStrategy === 'string'
            ? parsed.budgetStrategy
            : '',
        comparisonSummary: shouldShowComparison && typeof parsed?.comparisonSummary === 'string'
            ? parsed.comparisonSummary
            : undefined,
    };
}

function inferSlotGuidance(input: {
    auctionRole: string;
    playingRole: string;
    summary: string;
}) {
    const haystack = `${input.auctionRole} ${input.playingRole} ${input.summary}`.toLowerCase();
    const keeper = /wk|wicket-keeper|wicketkeeper/.test(haystack);
    const opener = /opening|opener/.test(haystack);
    const topOrder = opener || /top order|top-order|anchor/.test(haystack);
    const middleOrder = /middle order|middle-order/.test(haystack);
    const finisher = /finisher|finishing/.test(haystack);
    const allRounder = /all-rounder|all rounder/.test(haystack);
    const spinner = /spin|spinner|leg spinner|off spinner|left-arm orthodox|chinaman/.test(haystack);
    const pacer = /fast bowler|pace bowler|pacer|medium|seam/.test(haystack);
    const bowler = pacer || spinner || /bowler/.test(haystack);

    let battingRole = 'support batter';
    const bowlingRole = spinner ? 'spinner' : pacer ? 'pace bowler' : bowler ? 'bowler' : 'non-bowler';
    let preferredSlots: string[] = [];
    let avoidSlots: string[] = [];

    if (bowler && !allRounder && !keeper && !topOrder && !middleOrder && !finisher) {
        battingRole = 'specialist bowler';
        preferredSlots = spinner ? ['Spin Bowler', 'Bowling All-rounder'] : ['Pace Bowler 1', 'Pace Bowler 2'];
        avoidSlots = ['Opener 1', 'Opener 2', 'No. 3', 'No. 4', 'No. 5'];
    } else if (allRounder) {
        battingRole = finisher ? 'finishing all-rounder' : 'all-rounder';
        preferredSlots = spinner
            ? ['Bowling All-rounder', 'Batting All-rounder', 'Spin Bowler']
            : ['Batting All-rounder', 'Bowling All-rounder', 'No. 5'];
        avoidSlots = opener ? [] : ['Opener 1', 'Opener 2'];
    } else if (keeper) {
        battingRole = opener ? 'keeper-opener' : finisher ? 'keeper-finisher' : middleOrder ? 'keeper middle-order batter' : 'keeper batter';
        preferredSlots = opener
            ? ['Opener 1', 'Opener 2', 'No. 3']
            : finisher
                ? ['Wicketkeeper / Finisher', 'No. 5', 'No. 4']
                : ['No. 5', 'Wicketkeeper / Finisher', 'No. 4'];
        avoidSlots = ['Spin Bowler', 'Pace Bowler 1', 'Pace Bowler 2'];
    } else if (opener) {
        battingRole = 'opener';
        preferredSlots = ['Opener 1', 'Opener 2', 'No. 3'];
        avoidSlots = ['Spin Bowler', 'Pace Bowler 1', 'Pace Bowler 2'];
    } else if (topOrder) {
        battingRole = 'top-order batter';
        preferredSlots = ['No. 3', 'No. 4', 'Opener 2'];
        avoidSlots = ['Spin Bowler', 'Pace Bowler 1', 'Pace Bowler 2'];
    } else if (middleOrder) {
        battingRole = 'middle-order batter';
        preferredSlots = ['No. 4', 'No. 5', 'Wicketkeeper / Finisher'];
        avoidSlots = ['Opener 1', 'Opener 2'];
    } else if (finisher) {
        battingRole = 'finisher';
        preferredSlots = ['Wicketkeeper / Finisher', 'No. 5', 'Batting All-rounder'];
        avoidSlots = ['Opener 1', 'Opener 2'];
    } else {
        preferredSlots = ['No. 4', 'No. 5', 'No. 3'];
    }

    if (battingRole === 'specialist bowler' && pacer) {
        preferredSlots = ['Pace Bowler 2', 'Pace Bowler 1'];
    }

    return {
        preferredSlots,
        avoidSlots,
        battingRole,
        bowlingRole,
        keeper,
    };
}

function compactPlayerIntel(playerName: string, auctionRole: string, profile: Awaited<ReturnType<typeof fetchPlayerCareerProfile>> | null): AnalyzerPlayerIntel | null {
    if (!profile) {
        return null;
    }

    const t20iBatting = profile.battingStats.find((stat) => stat.format === 'T20I');
    const iplBatting = profile.battingStats.find((stat) => stat.format === 'IPL');
    const t20iBowling = profile.bowlingStats.find((stat) => stat.format === 'T20I');
    const iplBowling = profile.bowlingStats.find((stat) => stat.format === 'IPL');
    const slotGuidance = inferSlotGuidance({
        auctionRole,
        playingRole: profile.playingRole,
        summary: profile.summary,
    });

    return {
        name: profile.fullName || playerName,
        auctionRole,
        nationality: profile.nationality,
        age: profile.age,
        playingRole: profile.playingRole,
        battingStyle: profile.battingStyle,
        bowlingStyle: profile.bowlingStyle,
        iplTeams: profile.iplTeams.map((team) => team.name),
        summary: profile.summary,
        t20iBatting: t20iBatting ? {
            matches: t20iBatting.matches,
            runs: t20iBatting.runs,
            average: t20iBatting.average,
            strikeRate: t20iBatting.strikeRate,
            hundreds: t20iBatting.hundreds,
            fifties: t20iBatting.fifties,
        } : undefined,
        iplBatting: iplBatting ? {
            matches: iplBatting.matches,
            runs: iplBatting.runs,
            average: iplBatting.average,
            strikeRate: iplBatting.strikeRate,
            hundreds: iplBatting.hundreds,
            fifties: iplBatting.fifties,
        } : undefined,
        t20iBowling: t20iBowling ? {
            wickets: t20iBowling.wickets,
            average: t20iBowling.average,
            economy: t20iBowling.economy,
            strikeRate: t20iBowling.strikeRate,
            best: t20iBowling.best,
        } : undefined,
        iplBowling: iplBowling ? {
            wickets: iplBowling.wickets,
            average: iplBowling.average,
            economy: iplBowling.economy,
            strikeRate: iplBowling.strikeRate,
            best: iplBowling.best,
        } : undefined,
        slotGuidance,
    };
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>) {
    const results: R[] = new Array(items.length);
    let nextIndex = 0;

    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (nextIndex < items.length) {
            const currentIndex = nextIndex;
            nextIndex += 1;
            results[currentIndex] = await mapper(items[currentIndex]);
        }
    });

    await Promise.all(workers);
    return results;
}

async function buildPlayerIntel(
    players: Array<{ name: string; role?: string | null }>,
    limit?: number
) {
    const deduped = Array.from(
        new Map(
            players
                .filter((player) => player.name)
                .map((player) => [player.name.toLowerCase(), { name: player.name, role: player.role || 'Unassigned' }])
        ).values()
    );

    const trimmed = typeof limit === 'number' ? deduped.slice(0, limit) : deduped;

    const intel = await mapWithConcurrency(trimmed, 6, async (player) => {
        try {
            const profile = await fetchPlayerCareerProfile(player.name);
            return compactPlayerIntel(player.name, player.role, profile);
        } catch {
            return null;
        }
    });

    return intel.filter((item): item is AnalyzerPlayerIntel => Boolean(item));
}

function detectIntent(question: string): AnalyzerIntent {
    const normalized = question.trim().toLowerCase();

    if (/^(hi|hello|hey|yo|sup|hola)\b/.test(normalized)) {
        return 'greeting';
    }
    if (/(best xi|playing xi|probable xi|best eleven|starting xi|lineup)/.test(normalized)) {
        return 'playing_xi';
    }
    if (/(weak|gap|missing|problem|issue|concern)/.test(normalized)) {
        return 'weakness';
    }
    if (/(target|buy|pick|sign|auction target|who should)/.test(normalized)) {
        return 'targets';
    }
    if (/(compare|vs\b|versus|better than|stronger than)/.test(normalized)) {
        return 'comparison';
    }
    if (/(budget|spend|spending|money|funds|purse)/.test(normalized)) {
        return 'budget';
    }
    if (/(strong|strongest|best team|looks great|looks strongest)/.test(normalized)) {
        return 'strength';
    }

    return 'general';
}

function buildSystemPrompt(intent: AnalyzerIntent) {
    const intentInstruction = {
        greeting: 'For greetings, reply briefly and suggest 2 or 3 useful auction questions.',
        playing_xi: 'Prioritize bestXi and backups. Build a full projected XI using owned players plus target picks.',
        weakness: 'Prioritize weaknesses.',
        targets: 'Prioritize targets using unsold players and player intel.',
        comparison: 'Prioritize comparisonSummary.',
        budget: 'Prioritize budgetStrategy.',
        strength: 'Answer which team looks strongest using only the provided data.',
        general: 'Answer the latest question directly. Leave bestXi, backups, weaknesses, targets, budgetStrategy, and comparisonSummary empty unless the question explicitly asks for them.',
    }[intent];

    const xiInstruction = intent === 'playing_xi'
        ? `bestXi must contain exactly 11 entries using these slots where possible: ${PROJECTED_XI_SLOTS.join(', ')}. Each bestXi item needs slot, name, role, status(owned|target), reason.`
        : 'If the user is not asking for a team build or playing XI, return bestXi as an empty array and backups as an empty array.';

    return [
        'You are an IPL auction strategy assistant.',
        'Use only the provided data.',
        'Do not invent players, roles, prices, budgets, or squads.',
        'If data is missing, say so.',
        'Use player intel when present.',
        xiInstruction,
        'Respect team bias, conditions, and slotGuidance.',
        'Keep natural openers at the top and specialist bowlers late.',
        'Use owned players first; use target picks for missing roles.',
        intentInstruction,
        'Return only JSON.',
        '{"answer":"","bestXi":[{"slot":"","name":"","role":"","status":"owned|target","reason":""}],"backups":[{"name":"","role":"","reason":""}],"weaknesses":[""],"targets":[{"name":"","role":"","reason":""}],"budgetStrategy":"","comparisonSummary":""}',
    ].join(' ');
}

function buildConversationContext(messages: Array<{ role: 'user' | 'assistant'; text: string }> | undefined) {
    if (!messages?.length) {
        return 'No prior conversation.';
    }

    return messages
        .slice(-6)
        .map((message) => `${message.role.toUpperCase()}: ${message.text}`)
        .join('\n');
}

function compactRole(value: string | null | undefined) {
    const normalized = (value || '').toLowerCase();
    if (normalized.includes('wicket')) return 'WK';
    if (normalized.includes('all-round')) return 'AR';
    if (normalized.includes('bowler')) return 'BWL';
    if (normalized.includes('batsman')) return 'BAT';
    return value || 'NA';
}

function compactSnapshot(snapshot: any) {
    return {
        a: {
            id: snapshot.auction.id,
            t: snapshot.auction.title,
            cur: snapshot.auction.currency,
            bd: snapshot.auction.budgetDenomination,
            min: snapshot.auction.minSquadSize,
            max: snapshot.auction.maxSquadSize,
            cp: snapshot.auction.currentPrice,
            cpid: snapshot.auction.currentPlayerId,
            rtm: snapshot.auction.rtmStatus,
        },
        pref: {
            build: snapshot.squadPlanningPreferences.teamBuildPreference,
            pitch: snapshot.squadPlanningPreferences.pitchType,
            dew: snapshot.squadPlanningPreferences.dewFactor,
        },
        bias: {
            id: snapshot.teamBiasProfile.identity,
            notes: snapshot.teamBiasProfile.squadBuildNotes,
            tgt: snapshot.teamBiasProfile.targetBias,
        },
        st: {
            id: snapshot.selectedTeam.id,
            n: snapshot.selectedTeam.name,
            sn: snapshot.selectedTeam.shortName,
            b: snapshot.selectedTeam.budget,
            tb: snapshot.selectedTeam.totalBudget,
            ss: snapshot.selectedTeam.squadSize,
            rc: snapshot.selectedTeam.rtmCardsRemaining,
            rs: snapshot.selectedTeam.rtmSelectionsCount,
            p: snapshot.selectedTeam.players.map((player: any) => ({
                n: player.name,
                r: compactRole(player.role),
                sp: player.soldPrice,
                bp: player.basePrice,
                pt: player.previousTeamShortName,
            })),
        },
        sti: snapshot.selectedTeamPlayerIntel.map((player: any) => ({
            n: player.name,
            ar: compactRole(player.auctionRole),
            nat: player.nationality,
            age: player.age,
            pr: player.playingRole,
            bs: player.battingStyle,
            bo: player.bowlingStyle,
            it: player.iplTeams,
            s: player.summary,
            tb: player.t20iBatting ? [player.t20iBatting.runs, player.t20iBatting.average, player.t20iBatting.strikeRate] : null,
            ib: player.iplBatting ? [player.iplBatting.runs, player.iplBatting.average, player.iplBatting.strikeRate] : null,
            tw: player.t20iBowling ? [player.t20iBowling.wickets, player.t20iBowling.economy, player.t20iBowling.strikeRate] : null,
            iw: player.iplBowling ? [player.iplBowling.wickets, player.iplBowling.economy, player.iplBowling.strikeRate] : null,
            sg: {
                p: player.slotGuidance.preferredSlots,
                a: player.slotGuidance.avoidSlots,
                br: player.slotGuidance.battingRole,
                gwr: player.slotGuidance.bowlingRole,
                k: player.slotGuidance.keeper,
            },
        })),
        ct: snapshot.comparisonTeam ? {
            sn: snapshot.comparisonTeam.shortName,
            b: snapshot.comparisonTeam.budget,
            ss: snapshot.comparisonTeam.squadSize,
            p: snapshot.comparisonTeam.players.map((player: any) => ({
                n: player.name,
                r: compactRole(player.role),
                sp: player.soldPrice,
            })),
        } : null,
        ati: snapshot.availablePlayerIntel.map((player: any) => ({
            n: player.name,
            ar: compactRole(player.auctionRole),
            pr: player.playingRole,
            ib: player.iplBatting ? [player.iplBatting.runs, player.iplBatting.average, player.iplBatting.strikeRate] : null,
            iw: player.iplBowling ? [player.iplBowling.wickets, player.iplBowling.economy, player.iplBowling.strikeRate] : null,
            sg: {
                p: player.slotGuidance.preferredSlots,
                a: player.slotGuidance.avoidSlots,
                br: player.slotGuidance.battingRole,
                gwr: player.slotGuidance.bowlingRole,
                k: player.slotGuidance.keeper,
            },
        })),
        ap: snapshot.availablePlayers.map((player: any) => ({
            n: player.name,
            r: compactRole(player.role),
            bp: player.basePrice,
            pt: player.previousTeamShortName,
            m: player.marqueeSet,
        })),
        lc: snapshot.liveContext?.currentPlayer ? {
            n: snapshot.liveContext.currentPlayer.name,
            r: compactRole(snapshot.liveContext.currentPlayer.role),
            wb: snapshot.liveContext.currentPlayer.currentWinningBid,
        } : null,
    };
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        const rawBody = await request.json();
        const body = sanitizeAnalyzerRequestBody(rawBody);
        const validated = analyzerRequestSchema.parse(body);
        const teamBuildPreference = validated.teamBuildPreference || 'balanced';
        const pitchType = validated.pitchType || 'balanced';
        const dewFactor = validated.dewFactor || 'unknown';

        const apiKey = validated.groqApiKey?.trim() || process.env.GROQ_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { success: false, error: 'Add a Groq API key to start AI analysis' },
                { status: 400 }
            );
        }

        const auction = await prisma.auction.findUnique({
            where: { id: validated.auctionId },
            include: {
                teams: {
                    include: {
                        players: {
                            select: {
                                id: true,
                                name: true,
                                role: true,
                                description: true,
                                status: true,
                                basePrice: true,
                                soldPrice: true,
                                previousTeamShortName: true,
                            },
                        },
                        _count: {
                            select: {
                                rtmSelections: true,
                            },
                        },
                    },
                    orderBy: {
                        createdAt: 'asc',
                    },
                },
                players: {
                    include: {
                        team: {
                            select: {
                                id: true,
                                name: true,
                                shortName: true,
                                color: true,
                            },
                        },
                    },
                    orderBy: [
                        { auctionOrder: 'asc' },
                        { createdAt: 'asc' },
                    ],
                },
                bids: {
                    where: {
                        isWinning: true,
                    },
                    select: {
                        id: true,
                        amount: true,
                        playerId: true,
                        team: {
                            select: {
                                id: true,
                                shortName: true,
                            },
                        },
                    },
                },
            },
        });

        if (!auction || auction.auctionType !== 'TEAM') {
            return NextResponse.json(
                { success: false, error: 'Auction not found' },
                { status: 404 }
            );
        }

        const selectedTeam = auction.teams.find((team) => team.id === validated.selectedTeamId);
        if (!selectedTeam) {
            return NextResponse.json(
                { success: false, error: 'Selected team not found in this auction' },
                { status: 400 }
            );
        }

        const comparisonTeam = validated.comparisonTeamId
            ? auction.teams.find((team) => team.id === validated.comparisonTeamId)
            : null;

        const availablePlayers = auction.players
            .filter((player) => player.status === 'UNSOLD' && !player.isCurrentlyAuctioning)
            .map((player) => ({
                id: player.id,
                name: player.name,
                role: player.role || 'Unassigned',
                description: player.description,
                basePrice: Number(player.basePrice),
                previousTeamShortName: player.previousTeamShortName,
                marqueeSet: player.marqueeSet,
            }));
        const prioritizedAvailablePlayers = [...availablePlayers]
            .sort((left, right) => {
                if ((right.basePrice || 0) !== (left.basePrice || 0)) {
                    return (right.basePrice || 0) - (left.basePrice || 0);
                }
                if ((left.marqueeSet || 999) !== (right.marqueeSet || 999)) {
                    return (left.marqueeSet || 999) - (right.marqueeSet || 999);
                }
                return left.name.localeCompare(right.name);
            })
            .slice(0, 36);

        const winningBidsByPlayer = new Map(
            auction.bids
                .filter((bid) => bid.playerId)
                .map((bid) => [bid.playerId!, {
                    amount: Number(bid.amount),
                    teamShortName: bid.team?.shortName || null,
                }])
        );

        const [selectedTeamIntel, comparisonTeamIntel, availablePlayerIntel] = await Promise.all([
            buildPlayerIntel(selectedTeam.players.map((player) => ({ name: player.name, role: player.role }))),
            comparisonTeam
                ? buildPlayerIntel(comparisonTeam.players.map((player) => ({ name: player.name, role: player.role })), 12)
                : Promise.resolve([]),
            buildPlayerIntel(prioritizedAvailablePlayers.map((player) => ({ name: player.name, role: player.role })), 30),
        ]);

        const snapshot = {
            auction: {
                id: auction.id,
                title: auction.title,
                currency: auction.currency,
                budgetDenomination: auction.budgetDenomination,
                minSquadSize: auction.minSquadSize,
                maxSquadSize: auction.maxSquadSize,
                currentPrice: Number(auction.currentPrice),
                currentPlayerId: auction.currentPlayerId,
                rtmStatus: auction.rtmStatus,
            },
            squadPlanningPreferences: {
                teamBuildPreference,
                pitchType,
                dewFactor,
            },
            teamBiasProfile: TEAM_BIAS_PROFILES[selectedTeam.shortName] || {
                identity: `${selectedTeam.name} should be built around clear roles and natural player positions.`,
                squadBuildNotes: [
                    'Keep players in natural batting and bowling roles.',
                    'Balance specialists and all-rounders carefully.',
                    'Do not force pure bowlers too high in the XI.',
                ],
                targetBias: ['Best-fit role players', 'Condition-friendly picks'],
            },
            selectedTeam: {
                id: selectedTeam.id,
                name: selectedTeam.name,
                shortName: selectedTeam.shortName,
                budget: Number(selectedTeam.budget),
                totalBudget: Number(selectedTeam.totalBudget),
                squadSize: selectedTeam.squadSize,
                rtmCardsRemaining: selectedTeam.rtmCardsRemaining,
                rtmSelectionsCount: selectedTeam._count.rtmSelections,
                players: selectedTeam.players.map((player) => ({
                    id: player.id,
                    name: player.name,
                    role: player.role || 'Unassigned',
                    description: player.description,
                    soldPrice: player.soldPrice ? Number(player.soldPrice) : null,
                    basePrice: Number(player.basePrice),
                        previousTeamShortName: player.previousTeamShortName,
                    })),
            },
            selectedTeamPlayerIntel: selectedTeamIntel,
            comparisonTeam: comparisonTeam
                ? {
                    id: comparisonTeam.id,
                    name: comparisonTeam.name,
                    shortName: comparisonTeam.shortName,
                    budget: Number(comparisonTeam.budget),
                    totalBudget: Number(comparisonTeam.totalBudget),
                    squadSize: comparisonTeam.squadSize,
                    rtmCardsRemaining: comparisonTeam.rtmCardsRemaining,
                    rtmSelectionsCount: comparisonTeam._count.rtmSelections,
                    players: comparisonTeam.players.map((player) => ({
                        id: player.id,
                        name: player.name,
                        role: player.role || 'Unassigned',
                        description: player.description,
                        soldPrice: player.soldPrice ? Number(player.soldPrice) : null,
                        basePrice: Number(player.basePrice),
                        previousTeamShortName: player.previousTeamShortName,
                    })),
                }
                : null,
            comparisonTeamPlayerIntel: comparisonTeamIntel,
            allTeams: auction.teams.map((team) => ({
                id: team.id,
                name: team.name,
                shortName: team.shortName,
                budget: Number(team.budget),
                squadSize: team.squadSize,
                rtmCardsRemaining: team.rtmCardsRemaining,
                playersOwned: team.players.length,
            })),
            availablePlayers,
            availablePlayerIntel,
            liveContext: auction.currentPlayerId
                ? {
                    currentPlayer: auction.players.find((player) => player.id === auction.currentPlayerId)
                        ? {
                            id: auction.currentPlayerId,
                            name: auction.players.find((player) => player.id === auction.currentPlayerId)!.name,
                            role: auction.players.find((player) => player.id === auction.currentPlayerId)!.role || 'Unassigned',
                            currentWinningBid: winningBidsByPlayer.get(auction.currentPlayerId) || null,
                        }
                        : null,
                }
                : null,
        };

        const intent = detectIntent(validated.question);
        const currentSquadNameSet = new Set(selectedTeam.players.map((player) => player.name.toLowerCase()));
        const availablePlayerNameSet = new Set(availablePlayers.map((player) => player.name.toLowerCase()));
        const playerGuidanceMap = new Map<string, AnalyzerPlayerSlotGuidance>(
            [...selectedTeamIntel, ...availablePlayerIntel]
                .map((player) => [player.name.toLowerCase(), player.slotGuidance] as const)
        );
        const compact = compactSnapshot(snapshot);
        const prompt = [
            `Intent: ${intent}`,
            `Question: ${validated.question}`,
            `Conversation: ${buildConversationContext(validated.messages)}`,
            'Legend: a=auction, pref=preferences, bias=team bias, st=selected team, sti=selected team intel, ct=comparison team, ati=available target intel, ap=available players, lc=live context, n=name, r=role, b=budget, ss=squad size, sp=sold price, bp=base price, sg=slot guidance, p=preferred slots, a=avoid slots, br=batting role, gwr=bowling role, k=keeper, ib=IPL batting[runs,avg,sr], iw=IPL bowling[wkts,econ,sr], tb=T20I batting[runs,avg,sr], tw=T20I bowling[wkts,econ,sr].',
            'Rules: realistic XI, owned first, fill gaps with targets, respect bias and slot guidance.',
            'Data:',
            JSON.stringify(compact),
        ].join('\n');

        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
                temperature: 0.2,
                max_completion_tokens: 900,
                response_format: { type: 'json_object' },
                ...(session?.user?.id ? { user: session.user.id } : {}),
                messages: [
                    { role: 'system', content: buildSystemPrompt(intent) },
                    { role: 'user', content: prompt },
                ],
            }),
        });

        if (!groqResponse.ok) {
            const errorText = await groqResponse.text();
            return NextResponse.json(
                { success: false, error: `Groq request failed: ${errorText || groqResponse.statusText}` },
                { status: 400 }
            );
        }

        const groqJson = await groqResponse.json();
        const content = groqJson?.choices?.[0]?.message?.content;
        if (!content || typeof content !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Groq returned an empty response' },
                { status: 500 }
            );
        }

        const parsed = extractJsonObject(content);
        const analysis = sanitizeAnalysis(
            parsed,
            intent,
            validated.question,
            currentSquadNameSet,
            availablePlayerNameSet,
            playerGuidanceMap
        );

        return NextResponse.json({
            success: true,
            data: analysis,
        });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: error.errors[0].message },
                { status: 400 }
            );
        }

        console.error('AI analyzer error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to analyze auction' },
            { status: 500 }
        );
    }
}
