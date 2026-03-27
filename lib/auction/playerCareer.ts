type CricbuzzProfileEntry = {
    id: string;
    slug: string;
    url: string;
};

export type PlayerCareerStats = {
    format: 'Test' | 'ODI' | 'T20I' | 'IPL';
    matches: string;
    innings: string;
    runs: string;
    highest: string;
    average: string;
    strikeRate: string;
    hundreds: string;
    fifties: string;
};

export type PlayerBowlingCareerStats = {
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
};

export type PlayerCareerProfile = {
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
    battingStats: PlayerCareerStats[];
    bowlingStats: PlayerBowlingCareerStats[];
    sourceUrl: string;
};

const CRICBUZZ_SITEMAP_URL = 'https://www.cricbuzz.com/sitemap/cricket-player-profile.xml';
const FETCH_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
};
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const IPL_TEAMS = new Set([
    'Chennai Super Kings',
    'Delhi Capitals',
    'Delhi Daredevils',
    'Gujarat Lions',
    'Gujarat Titans',
    'Kings XI Punjab',
    'Kochi Tuskers Kerala',
    'Kolkata Knight Riders',
    'Lucknow Super Giants',
    'Mumbai Indians',
    'Punjab Kings',
    'Pune Warriors India',
    'Rajasthan Royals',
    'Rising Pune Supergiant',
    'Rising Pune Supergiants',
    'Royal Challengers Bangalore',
    'Royal Challengers Bengaluru',
    'Sunrisers Hyderabad',
    'Deccan Chargers',
]);

let sitemapCache:
    | {
        expiresAt: number;
        entries: CricbuzzProfileEntry[];
    }
    | null = null;

const profileCache = new Map<string, { expiresAt: number; profile: PlayerCareerProfile }>();

function slugify(value: string) {
    return value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/['’.]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function decodeHtml(value: string) {
    return value
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;|&#39;/g, '\'')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ');
}

function stripHtml(value: string) {
    return decodeHtml(value.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' '))
        .replace(/\s+/g, ' ')
        .trim();
}

async function fetchText(url: string) {
    const response = await fetch(url, { headers: FETCH_HEADERS });
    if (!response.ok) {
        throw new Error(`Failed to fetch Cricbuzz data (${response.status})`);
    }
    return response.text();
}

async function getProfileEntries() {
    if (sitemapCache && sitemapCache.expiresAt > Date.now()) {
        return sitemapCache.entries;
    }

    const xml = await fetchText(CRICBUZZ_SITEMAP_URL);
    const entries = Array.from(xml.matchAll(/<loc>https:\/\/www\.cricbuzz\.com\/profiles\/(\d+)\/([^<]+)<\/loc>/g)).map(
        (match) => ({
            id: match[1],
            slug: match[2],
            url: `https://www.cricbuzz.com/profiles/${match[1]}/${match[2]}`,
        })
    );

    sitemapCache = {
        expiresAt: Date.now() + CACHE_TTL_MS,
        entries,
    };

    return entries;
}

function findProfileEntry(playerName: string, entries: CricbuzzProfileEntry[]) {
    const normalized = slugify(playerName);

    return (
        entries.find((entry) => entry.slug === normalized) ||
        entries.find((entry) => entry.slug.startsWith(`${normalized}-`)) ||
        entries.find((entry) => normalized.startsWith(entry.slug)) ||
        entries.find((entry) => entry.slug.includes(normalized) || normalized.includes(entry.slug))
    );
}

function extractJsonScript(html: string) {
    const matches = Array.from(html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g));

    for (const match of matches) {
        try {
            const parsed = JSON.parse(match[1]);
            if (parsed?.mainEntity?.type === 'Person' || parsed?.mainEntity?.['@type'] === 'Person') {
                return parsed.mainEntity;
            }
        } catch {
            continue;
        }
    }

    return null;
}

function extractField(html: string, label: string) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`${escaped}<\\/div><div[^>]*>([\\s\\S]*?)<\\/div>`, 'i');
    const match = html.match(regex);
    return match ? stripHtml(match[1]) : '';
}

function summarizeDescription(description: string) {
    const cleaned = stripHtml(description).replace(/\s+/g, ' ').trim();
    if (!cleaned) {
        return '';
    }

    const sentences = cleaned.match(/[^.!?]+[.!?]+/g);
    if (sentences?.length) {
        return sentences.slice(0, 2).join(' ').trim();
    }

    return cleaned.slice(0, 240).trim();
}

function extractCareerTableRows(html: string, heading: string) {
    const start = html.indexOf(heading);
    if (start < 0) {
        return [];
    }

    const tableStart = html.indexOf('<table', start);
    const tableEnd = html.indexOf('</table>', tableStart);
    if (tableStart < 0 || tableEnd < 0) {
        return [];
    }

    const tableHtml = html.slice(tableStart, tableEnd + '</table>'.length);
    const rows = Array.from(tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi))
        .slice(1)
        .map((rowMatch) =>
            Array.from(rowMatch[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)).map((cellMatch) => stripHtml(cellMatch[1]))
        )
        .filter((cells) => cells.length >= 5);

    return rows;
}

function extractBattingCareerStats(html: string): PlayerCareerStats[] {
    const rows = extractCareerTableRows(html, 'Batting Career Summary');
    const valueByLabel = new Map<string, string[]>();
    rows.forEach((cells) => {
        valueByLabel.set(cells[0], cells.slice(1, 5));
    });

    const formats = [
        { label: 'Test', key: 'Test' as const, index: 0 },
        { label: 'ODI', key: 'ODI' as const, index: 1 },
        { label: 'T20I', key: 'T20I' as const, index: 2 },
        { label: 'IPL', key: 'IPL' as const, index: 3 },
    ];

    return formats.map((format) => ({
        format: format.key,
        matches: valueByLabel.get('Matches')?.[format.index] || '-',
        innings: valueByLabel.get('Innings')?.[format.index] || '-',
        runs: valueByLabel.get('Runs')?.[format.index] || '-',
        highest: valueByLabel.get('Highest')?.[format.index] || '-',
        average: valueByLabel.get('Average')?.[format.index] || '-',
        strikeRate: valueByLabel.get('SR')?.[format.index] || '-',
        hundreds: valueByLabel.get('100s')?.[format.index] || '-',
        fifties: valueByLabel.get('50s')?.[format.index] || '-',
    }));
}

function extractBowlingCareerStats(html: string): PlayerBowlingCareerStats[] {
    const rows = extractCareerTableRows(html, 'Bowling Career Summary');
    const valueByLabel = new Map<string, string[]>();
    rows.forEach((cells) => {
        valueByLabel.set(cells[0], cells.slice(1, 5));
    });

    const formats = [
        { key: 'Test' as const, index: 0 },
        { key: 'ODI' as const, index: 1 },
        { key: 'T20I' as const, index: 2 },
        { key: 'IPL' as const, index: 3 },
    ];

    return formats.map((format) => ({
        format: format.key,
        matches: valueByLabel.get('Matches')?.[format.index] || '-',
        innings: valueByLabel.get('Innings')?.[format.index] || '-',
        balls: valueByLabel.get('Balls')?.[format.index] || '-',
        runs: valueByLabel.get('Runs')?.[format.index] || '-',
        wickets: valueByLabel.get('Wickets')?.[format.index] || valueByLabel.get('Wkts')?.[format.index] || '-',
        best: valueByLabel.get('Best')?.[format.index] || valueByLabel.get('BBI')?.[format.index] || '-',
        average: valueByLabel.get('Average')?.[format.index] || valueByLabel.get('Avg')?.[format.index] || '-',
        economy: valueByLabel.get('Economy')?.[format.index] || valueByLabel.get('Econ')?.[format.index] || valueByLabel.get('Eco')?.[format.index] || '-',
        strikeRate: valueByLabel.get('SR')?.[format.index] || '-',
    }));
}

function extractIplTeams(teamsText: string) {
    return teamsText
        .split(',')
        .map((team) => team.trim())
        .filter((team, index, array) => team && array.indexOf(team) === index)
        .filter((team) => IPL_TEAMS.has(team))
        .map((team) => ({ name: team, years: null }));
}

export async function fetchPlayerCareerProfile(playerName: string): Promise<PlayerCareerProfile> {
    const cacheKey = slugify(playerName);
    const cached = profileCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.profile;
    }

    const entries = await getProfileEntries();
    const profileEntry = findProfileEntry(playerName, entries);

    if (!profileEntry) {
        throw new Error(`No public career profile found for ${playerName}`);
    }

    const html = await fetchText(profileEntry.url);
    const person = extractJsonScript(html);
    const fullName = person?.name || playerName;
    const nationality = typeof person?.nationality === 'string' ? person.nationality : '';
    const bornValue = extractField(html, 'Born');
    const age = bornValue.match(/\(([^)]+)\)/)?.[1] || '';
    const playingRole = extractField(html, 'Role');
    const battingStyle = extractField(html, 'Batting Style');
    const bowlingStyle = extractField(html, 'Bowling Style');
    const teamsText = extractField(html, 'Teams') || (typeof person?.worksFor === 'string' ? person.worksFor : '');
    const iplTeams = extractIplTeams(teamsText);
    const summary = summarizeDescription(typeof person?.description === 'string' ? person.description : '');
    const battingStats = extractBattingCareerStats(html);
    const bowlingStats = extractBowlingCareerStats(html);

    const profile: PlayerCareerProfile = {
        fullName,
        nationality,
        age,
        battingStyle,
        bowlingStyle,
        playingRole,
        iplTeams,
        summary,
        battingStats,
        bowlingStats,
        sourceUrl: profileEntry.url,
    };

    profileCache.set(cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        profile,
    });

    return profile;
}
