import { buildCricbuzzProfileUrl, findRegisteredPlayerSource } from '@/lib/auction/playerCareerRegistry';

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
const ESPN_SEARCH_URL = 'https://stats.espncricinfo.com/ci/engine/stats/analysis.html?search=';
const ESPN_STATSGURU_PLAYER_URL = 'https://stats.espncricinfo.com/ci/engine/player';
const ENABLE_CRICBUZZ_PROVIDER = false;
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
        throw new Error(`Failed to fetch player data (${response.status})`);
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

function formatValue(value: string | number | null | undefined) {
    if (value === null || value === undefined || value === '') {
        return '-';
    }

    return String(value).trim() || '-';
}

function formatEspnAge(dateOfBirth: { year?: number; month?: number; date?: number } | null | undefined) {
    if (!dateOfBirth?.year || !dateOfBirth?.month || !dateOfBirth?.date) {
        return '';
    }

    const birthDate = new Date(Date.UTC(dateOfBirth.year, dateOfBirth.month - 1, dateOfBirth.date));
    if (Number.isNaN(birthDate.getTime())) {
        return '';
    }

    const now = new Date();
    let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
    const monthDelta = now.getUTCMonth() - birthDate.getUTCMonth();
    const dayDelta = now.getUTCDate() - birthDate.getUTCDate();

    if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) {
        age -= 1;
    }

    return age > 0 ? `${age} years` : '';
}

function getRegisteredCricbuzzProfileEntry(playerName: string): CricbuzzProfileEntry | null {
    const registeredSource = findRegisteredPlayerSource(playerName);
    if (!registeredSource?.cricbuzz) {
        return null;
    }

    return {
        id: registeredSource.cricbuzz.id,
        slug: registeredSource.cricbuzz.slug,
        url: buildCricbuzzProfileUrl(registeredSource.cricbuzz),
    };
}

function buildEmptyBattingStats(format: PlayerCareerStats['format']): PlayerCareerStats {
    return {
        format,
        matches: '-',
        innings: '-',
        runs: '-',
        highest: '-',
        average: '-',
        strikeRate: '-',
        hundreds: '-',
        fifties: '-',
    };
}

function buildEmptyBowlingStats(format: PlayerBowlingCareerStats['format']): PlayerBowlingCareerStats {
    return {
        format,
        matches: '-',
        innings: '-',
        balls: '-',
        runs: '-',
        wickets: '-',
        best: '-',
        average: '-',
        economy: '-',
        strikeRate: '-',
    };
}

function extractEspnPlayerEntries(html: string) {
    const rowRegex = /<td><span style="white-space: nowrap">([^<]+)<\/span>(?:\s*<span style="white-space: nowrap">\(([^<]+)\)<\/span>)?<\/td>\s*<td>\s*([^<]+)\s*<\/td>\s*<td style="white-space: nowrap">[\s\S]*?\/ci\/engine\/player\/(\d+)\.html/gi;
    const entries = Array.from(html.matchAll(rowRegex)).map((match) => ({
        id: match[4],
        name: (match[2] || match[1] || '').trim(),
        country: stripHtml(match[3] || ''),
    }));

    return Array.from(
        new Map(entries.filter((entry) => entry.name).map((entry) => [entry.id, entry])).values()
    );
}

async function findEspnPlayerEntry(playerName: string) {
    const html = await fetchText(`${ESPN_SEARCH_URL}${encodeURIComponent(playerName)}`);
    const normalized = slugify(playerName);
    const entries = extractEspnPlayerEntries(html);
    const queryTokens = normalized.split('-').filter(Boolean);

    const exactMatch = entries.find((entry) => slugify(entry.name) === normalized);
    if (exactMatch) {
        return exactMatch;
    }

    const containsFullQuery = entries.find((entry) => {
        const candidate = slugify(entry.name);
        return candidate.includes(normalized) || normalized.includes(candidate);
    });
    if (containsFullQuery) {
        return containsFullQuery;
    }

    const allTokensPresent = entries.find((entry) => {
        const candidateTokens = new Set(slugify(entry.name).split('-').filter(Boolean));
        return queryTokens.length > 0 && queryTokens.every((token) => candidateTokens.has(token));
    });
    if (allTokensPresent) {
        return allTokensPresent;
    }

    return null;
}

function cacheProfile(profile: PlayerCareerProfile, ...cacheKeys: string[]) {
    const uniqueCacheKeys = Array.from(new Set(cacheKeys.filter(Boolean)));

    uniqueCacheKeys.forEach((cacheKey) => {
        profileCache.set(cacheKey, {
            expiresAt: Date.now() + CACHE_TTL_MS,
            profile,
        });
    });
}

function buildCricbuzzProfileFromHtml(html: string, playerName: string, sourceUrl: string): PlayerCareerProfile {
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

    return {
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
        sourceUrl,
    };
}

async function fetchCricbuzzProfile(profileEntry: CricbuzzProfileEntry, playerName: string) {
    const html = await fetchText(profileEntry.url);
    return buildCricbuzzProfileFromHtml(html, playerName, profileEntry.url);
}

const ESPN_COUNTRY_NAMES: Record<string, string> = {
    AFG: 'Afghanistan',
    AUS: 'Australia',
    BAN: 'Bangladesh',
    CAN: 'Canada',
    ENG: 'England',
    IND: 'India',
    IRE: 'Ireland',
    NAM: 'Namibia',
    NED: 'Netherlands',
    NZ: 'New Zealand',
    PAK: 'Pakistan',
    PNG: 'Papua New Guinea',
    SA: 'South Africa',
    SCO: 'Scotland',
    SL: 'Sri Lanka',
    UAE: 'United Arab Emirates',
    UGA: 'Uganda',
    WI: 'West Indies',
    ZIM: 'Zimbabwe',
};

const ESPN_IPL_TEAM_NAME_MAP: Record<string, string> = {
    CSK: 'Chennai Super Kings',
    DC: 'Delhi Capitals',
    Daredevils: 'Delhi Daredevils',
    DD: 'Delhi Daredevils',
    GL: 'Gujarat Lions',
    GT: 'Gujarat Titans',
    'Kings XI': 'Kings XI Punjab',
    KKR: 'Kolkata Knight Riders',
    LSG: 'Lucknow Super Giants',
    MI: 'Mumbai Indians',
    PBKS: 'Punjab Kings',
    RR: 'Rajasthan Royals',
    RPS: 'Rising Pune Supergiant',
    RPSG: 'Rising Pune Supergiants',
    RCB: 'Royal Challengers Bengaluru',
    SRH: 'Sunrisers Hyderabad',
    Deccan: 'Deccan Chargers',
};

function buildEspnStatsguruUrl(
    espnId: string,
    type: 'allround' | 'batting' | 'bowling',
    options?: { classId?: number; trophyId?: number; template?: 'results' | null }
) {
    const classId = options?.classId ?? 11;
    const template = options?.template === null ? '' : ';template=results';
    const trophy = options?.trophyId ? `;trophy=${options.trophyId}` : '';
    return `${ESPN_STATSGURU_PLAYER_URL}/${espnId}.html?class=${classId}${template}${trophy};type=${type}`;
}

function formatEspnAgeFromBornText(bornText: string) {
    if (!bornText) {
        return '';
    }

    const parsed = new Date(bornText);
    if (Number.isNaN(parsed.getTime())) {
        return '';
    }

    return formatEspnAge({
        year: parsed.getUTCFullYear(),
        month: parsed.getUTCMonth() + 1,
        date: parsed.getUTCDate(),
    });
}

function inferEspnPlayingRole(detailsText: string) {
    const normalized = detailsText.toLowerCase();
    if (normalized.includes('wicketkeeper')) {
        return 'Wicketkeeper batter';
    }
    if (normalized.includes('all-rounder')) {
        return 'All-rounder';
    }
    if (normalized.includes('bat') && (normalized.includes('arm') || normalized.includes('break') || normalized.includes('spin'))) {
        return 'All-rounder';
    }
    if (normalized.includes('bat')) {
        return 'Batter';
    }
    if (normalized.includes('arm') || normalized.includes('break') || normalized.includes('spin')) {
        return 'Bowler';
    }
    return '';
}

function parseEspnStatsguruHeader(html: string, playerName: string) {
    const headerMatch = html.match(
        /<p style="padding-bottom:10px">\s*<b>([^<]+)<\/b>\s*-\s*([\s\S]*?)\s*-\s*<a href="([^"]+)"[^>]*>Player profile<\/a><br>\s*<b>Born<\/b>\s*([^<]+)\s*<\/p>/i
    );

    if (!headerMatch) {
        return {
            fullName: playerName,
            battingStyle: '',
            bowlingStyle: '',
            playingRole: '',
            age: '',
            profilePath: '',
        };
    }

    const fullName = stripHtml(headerMatch[1] || playerName) || playerName;
    const detailsText = stripHtml(headerMatch[2] || '');
    const profilePath = headerMatch[3] || '';
    const bornText = stripHtml(headerMatch[4] || '');
    const detailParts = detailsText.split(';').map((part) => part.trim()).filter(Boolean);
    const battingStyle = detailParts.find((part) => /bat/i.test(part)) || '';
    const bowlingStyle = detailParts.find((part) => /(arm|break|spin|medium|fast|seam)/i.test(part)) || '';
    const explicitRole = detailParts.find((part) => /wicketkeeper|all-rounder|batter|bowler/i.test(part)) || '';

    return {
        fullName,
        battingStyle,
        bowlingStyle,
        playingRole: explicitRole || inferEspnPlayingRole(detailsText),
        age: formatEspnAgeFromBornText(bornText),
        profilePath,
    };
}

function extractEspnStatsguruTableRows(html: string, caption: string) {
    const escapedCaption = caption.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tableRegex = new RegExp(
        `<table class="engineTable">\\s*<caption>${escapedCaption}<\\/caption>[\\s\\S]*?<tbody>([\\s\\S]*?)<\\/tbody>\\s*<\\/table>`,
        'i'
    );
    const tableMatch = html.match(tableRegex);

    if (!tableMatch) {
        return [];
    }

    return Array.from(tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)).map((rowMatch) =>
        Array.from(rowMatch[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)).map((cellMatch) =>
            stripHtml(cellMatch[1]).replace(/\s+/g, ' ').trim()
        )
    );
}

function extractEspnInternationalRows(rows: string[][]) {
    const collected: string[][] = [];

    for (const row of rows) {
        const label = row[0] || '';
        if (!label) {
            if (collected.length > 0) {
                break;
            }
            continue;
        }

        if (/^(Test matches|One-Day Internationals|Twenty20 Internationals)$/i.test(label)) {
            collected.push(row);
            continue;
        }

        if (collected.length > 0) {
            break;
        }
    }

    return collected;
}

function espnRowLabelToFormat(label: string): PlayerCareerStats['format'] | null {
    if (/^Test matches$/i.test(label)) return 'Test';
    if (/^One-Day Internationals$/i.test(label)) return 'ODI';
    if (/^Twenty20 Internationals$/i.test(label)) return 'T20I';
    return null;
}

function parseNumber(value: string | undefined) {
    const normalized = String(value || '').replace(/,/g, '').trim();
    if (!normalized || normalized === '-') {
        return null;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function parseHighestScore(value: string | undefined) {
    const normalized = String(value || '').trim();
    if (!normalized || normalized === '-') {
        return { score: -1, raw: '-' };
    }

    const numeric = Number(normalized.replace(/\*/g, ''));
    return {
        score: Number.isFinite(numeric) ? numeric : -1,
        raw: normalized,
    };
}

function formatDecimal(value: number) {
    if (!Number.isFinite(value)) {
        return '-';
    }

    return Number(value.toFixed(2)).toString();
}

function extractEspnLeadingGroupRows(rows: string[][]) {
    const collected: string[][] = [];

    for (const row of rows) {
        const label = row[0] || '';
        if (!label) {
            if (collected.length > 0) {
                break;
            }
            continue;
        }

        collected.push(row);
    }

    return collected;
}

function normalizeEspnIplTeamLabel(label: string) {
    return ESPN_IPL_TEAM_NAME_MAP[label] || label;
}

function buildEspnIplTeams(rows: string[][]) {
    return extractEspnLeadingGroupRows(rows)
        .map((row) => ({
            name: normalizeEspnIplTeamLabel(row[0] || ''),
            years: row[1] || null,
        }))
        .filter((team, index, array) => team.name && array.findIndex((candidate) => candidate.name === team.name) === index);
}

function buildEspnIplBattingStats(rows: string[][]): PlayerCareerStats {
    const teamRows = extractEspnLeadingGroupRows(rows);
    if (teamRows.length === 0) {
        return buildEmptyBattingStats('IPL');
    }

    let matches = 0;
    let innings = 0;
    let notOuts = 0;
    let runs = 0;
    let ballsFaced = 0;
    let hundreds = 0;
    let fifties = 0;
    let hasNumbers = false;
    let highest = { score: -1, raw: '-' };

    teamRows.forEach((row) => {
        matches += parseNumber(row[2]) || 0;
        innings += parseNumber(row[3]) || 0;
        notOuts += parseNumber(row[4]) || 0;
        runs += parseNumber(row[5]) || 0;
        ballsFaced += parseNumber(row[8]) || 0;
        hundreds += parseNumber(row[10]) || 0;
        fifties += parseNumber(row[11]) || 0;

        if (parseNumber(row[2]) !== null || parseNumber(row[5]) !== null) {
            hasNumbers = true;
        }

        const currentHighest = parseHighestScore(row[6]);
        if (currentHighest.score > highest.score) {
            highest = currentHighest;
        }
    });

    if (!hasNumbers) {
        return buildEmptyBattingStats('IPL');
    }

    const dismissals = innings - notOuts;
    return {
        format: 'IPL',
        matches: formatValue(matches),
        innings: formatValue(innings),
        runs: formatValue(runs),
        highest: highest.raw,
        average: dismissals > 0 ? formatDecimal(runs / dismissals) : '-',
        strikeRate: ballsFaced > 0 ? formatDecimal((runs * 100) / ballsFaced) : '-',
        hundreds: formatValue(hundreds),
        fifties: formatValue(fifties),
    };
}

function buildEspnIplBowlingStats(rows: string[][]): PlayerBowlingCareerStats {
    const teamRows = extractEspnLeadingGroupRows(rows);
    if (teamRows.length === 0) {
        return buildEmptyBowlingStats('IPL');
    }

    let matches = 0;
    let innings = 0;
    let balls = 0;
    let wickets = 0;
    let runs = 0;
    let hasNumbers = false;
    let best = { score: -1, raw: '-' };

    teamRows.forEach((row) => {
        matches += parseNumber(row[2]) || 0;
        innings += parseNumber(row[3]) || 0;
        wickets += parseNumber(row[5]) || 0;
        runs += parseNumber(row[6]) || 0;

        const oversText = String(row[4] || '').trim();
        if (oversText && oversText !== '-') {
            const [wholeOvers, partialBalls] = oversText.split('.');
            balls += (parseNumber(wholeOvers) || 0) * 6 + (parseNumber(partialBalls) || 0);
        }

        if (parseNumber(row[5]) !== null || parseNumber(row[6]) !== null) {
            hasNumbers = true;
        }

        const bestText = String(row[8] || '').trim();
        const bestMatch = bestText.match(/(\d+)\s*\/\s*(\d+)/);
        const bestScore = bestMatch ? Number(bestMatch[1]) * 1000 - Number(bestMatch[2]) : -1;
        if (bestScore > best.score) {
            best = { score: bestScore, raw: bestText || '-' };
        }
    });

    if (!hasNumbers || wickets === 0 && runs === 0 && innings === 0) {
        return buildEmptyBowlingStats('IPL');
    }

    return {
        format: 'IPL',
        matches: formatValue(matches),
        innings: formatValue(innings),
        balls: formatValue(balls),
        runs: formatValue(runs),
        wickets: formatValue(wickets),
        best: best.raw,
        average: wickets > 0 ? formatDecimal(runs / wickets) : '-',
        economy: balls > 0 ? formatDecimal((runs * 6) / balls) : '-',
        strikeRate: wickets > 0 ? formatDecimal(balls / wickets) : '-',
    };
}

function buildEspnBattingStatsFromRows(rows: string[][]) {
    const statsByFormat = new Map<PlayerCareerStats['format'], PlayerCareerStats>();

    extractEspnInternationalRows(rows).forEach((row) => {
        const format = espnRowLabelToFormat(row[0] || '');
        if (!format) {
            return;
        }

        statsByFormat.set(format, {
            format,
            matches: formatValue(row[2]),
            innings: formatValue(row[3]),
            runs: formatValue(row[5]),
            highest: formatValue(row[6]),
            average: formatValue(row[7]),
            strikeRate: formatValue(row[9]),
            hundreds: formatValue(row[10]),
            fifties: formatValue(row[11]),
        });
    });

    return [
        statsByFormat.get('Test') || buildEmptyBattingStats('Test'),
        statsByFormat.get('ODI') || buildEmptyBattingStats('ODI'),
        statsByFormat.get('T20I') || buildEmptyBattingStats('T20I'),
        buildEmptyBattingStats('IPL'),
    ];
}

function buildEspnBowlingStatsFromRows(rows: string[][]) {
    const statsByFormat = new Map<PlayerBowlingCareerStats['format'], PlayerBowlingCareerStats>();

    extractEspnInternationalRows(rows).forEach((row) => {
        const format = espnRowLabelToFormat(row[0] || '');
        if (!format) {
            return;
        }

        statsByFormat.set(format, {
            format,
            matches: formatValue(row[2]),
            innings: formatValue(row[3]),
            balls: formatValue(row[4]),
            runs: formatValue(row[6]),
            wickets: formatValue(row[5]),
            best: formatValue(row[8]),
            average: formatValue(row[10]),
            economy: formatValue(row[11]),
            strikeRate: formatValue(row[12]),
        });
    });

    return [
        statsByFormat.get('Test') || buildEmptyBowlingStats('Test'),
        statsByFormat.get('ODI') || buildEmptyBowlingStats('ODI'),
        statsByFormat.get('T20I') || buildEmptyBowlingStats('T20I'),
        buildEmptyBowlingStats('IPL'),
    ];
}

async function fetchEspnCareerProfile(espnId: string, playerName: string) {
    const [headerHtml, battingHtml, bowlingHtml, searchHtml, iplBattingHtml, iplBowlingHtml] = await Promise.all([
        fetchText(buildEspnStatsguruUrl(espnId, 'allround', { template: null })),
        fetchText(buildEspnStatsguruUrl(espnId, 'batting')),
        fetchText(buildEspnStatsguruUrl(espnId, 'bowling')),
        fetchText(`${ESPN_SEARCH_URL}${encodeURIComponent(playerName)}`),
        fetchText(buildEspnStatsguruUrl(espnId, 'batting', { classId: 6, trophyId: 117 })),
        fetchText(buildEspnStatsguruUrl(espnId, 'bowling', { classId: 6, trophyId: 117 })),
    ]);

    const header = parseEspnStatsguruHeader(headerHtml, playerName);
    const battingRows = extractEspnStatsguruTableRows(battingHtml, 'Career summary');
    const bowlingRows = extractEspnStatsguruTableRows(bowlingHtml, 'Career summary');
    const iplBattingRows = extractEspnStatsguruTableRows(iplBattingHtml, 'Career summary');
    const iplBowlingRows = extractEspnStatsguruTableRows(iplBowlingHtml, 'Career summary');
    const searchEntries = extractEspnPlayerEntries(searchHtml);
    const exactSearchEntry = searchEntries.find((entry) => entry.id === espnId)
        || searchEntries.find((entry) => slugify(entry.name) === slugify(playerName))
        || null;
    const nationalityCode = exactSearchEntry?.country || '';
    const sourceUrl = header.profilePath
        ? `https://www.espncricinfo.com${header.profilePath}`
        : buildEspnStatsguruUrl(espnId, 'allround', { template: null });
    const battingStats = buildEspnBattingStatsFromRows(battingRows);
    battingStats[3] = buildEspnIplBattingStats(iplBattingRows);
    const bowlingStats = buildEspnBowlingStatsFromRows(bowlingRows);
    bowlingStats[3] = buildEspnIplBowlingStats(iplBowlingRows);

    return {
        fullName: header.fullName || playerName,
        nationality: ESPN_COUNTRY_NAMES[nationalityCode] || nationalityCode,
        age: header.age,
        battingStyle: header.battingStyle,
        bowlingStyle: header.bowlingStyle,
        playingRole: header.playingRole,
        iplTeams: buildEspnIplTeams(iplBattingRows),
        summary: '',
        battingStats,
        bowlingStats,
        sourceUrl,
    };
}

type PlayerCareerProvider = 'cricbuzz' | 'espn';

type PlayerCareerAttempt = {
    provider: PlayerCareerProvider;
    cacheKeys: string[];
    load: () => Promise<PlayerCareerProfile>;
};

function hasMeaningfulValue(value: string | null | undefined) {
    return Boolean(value && value.trim() && value.trim() !== '-');
}

function scoreBattingRow(row: PlayerCareerStats) {
    return [
        row.matches,
        row.innings,
        row.runs,
        row.highest,
        row.average,
        row.strikeRate,
        row.hundreds,
        row.fifties,
    ].filter(hasMeaningfulValue).length;
}

function scoreBowlingRow(row: PlayerBowlingCareerStats) {
    return [
        row.matches,
        row.innings,
        row.balls,
        row.runs,
        row.wickets,
        row.best,
        row.average,
        row.economy,
        row.strikeRate,
    ].filter(hasMeaningfulValue).length;
}

function scoreProfile(profile: PlayerCareerProfile) {
    return [
        hasMeaningfulValue(profile.fullName) ? 2 : 0,
        hasMeaningfulValue(profile.nationality) ? 1 : 0,
        hasMeaningfulValue(profile.age) ? 1 : 0,
        hasMeaningfulValue(profile.battingStyle) ? 1 : 0,
        hasMeaningfulValue(profile.bowlingStyle) ? 1 : 0,
        hasMeaningfulValue(profile.playingRole) ? 1 : 0,
        hasMeaningfulValue(profile.summary) ? 3 : 0,
        Math.min(profile.iplTeams.length, 4),
        profile.battingStats.reduce((total, row) => total + scoreBattingRow(row), 0),
        profile.bowlingStats.reduce((total, row) => total + scoreBowlingRow(row), 0),
    ].reduce((total, current) => total + current, 0);
}

function chooseBetterProfile(left: PlayerCareerProfile, right: PlayerCareerProfile) {
    const leftScore = scoreProfile(left);
    const rightScore = scoreProfile(right);

    if (rightScore > leftScore) {
        return right;
    }

    if (leftScore > rightScore) {
        return left;
    }

    return (right.summary?.length || 0) > (left.summary?.length || 0) ? right : left;
}

function mergeIplTeams(
    primaryTeams: PlayerCareerProfile['iplTeams'],
    secondaryTeams: PlayerCareerProfile['iplTeams']
) {
    const merged = new Map<string, { name: string; years?: string | null }>();

    [...primaryTeams, ...secondaryTeams].forEach((team) => {
        const normalized = team.name.trim().toLowerCase();
        if (!normalized) {
            return;
        }

        const existing = merged.get(normalized);
        if (!existing) {
            merged.set(normalized, team);
            return;
        }

        if (!existing.years && team.years) {
            merged.set(normalized, { ...existing, years: team.years });
        }
    });

    return Array.from(merged.values());
}

function mergeBattingStats(primaryStats: PlayerCareerStats[], secondaryStats: PlayerCareerStats[]) {
    return primaryStats.map((row, index) => {
        const secondaryRow = secondaryStats[index];
        if (!secondaryRow) {
            return row;
        }

        return scoreBattingRow(secondaryRow) > scoreBattingRow(row) ? secondaryRow : row;
    });
}

function mergeBowlingStats(primaryStats: PlayerBowlingCareerStats[], secondaryStats: PlayerBowlingCareerStats[]) {
    return primaryStats.map((row, index) => {
        const secondaryRow = secondaryStats[index];
        if (!secondaryRow) {
            return row;
        }

        return scoreBowlingRow(secondaryRow) > scoreBowlingRow(row) ? secondaryRow : row;
    });
}

function mergeProfiles(base: PlayerCareerProfile, incoming: PlayerCareerProfile): PlayerCareerProfile {
    const preferredBase = chooseBetterProfile(base, incoming);
    const secondary = preferredBase === base ? incoming : base;

    return {
        fullName: hasMeaningfulValue(preferredBase.fullName) ? preferredBase.fullName : secondary.fullName,
        nationality: hasMeaningfulValue(preferredBase.nationality) ? preferredBase.nationality : secondary.nationality,
        age: hasMeaningfulValue(preferredBase.age) ? preferredBase.age : secondary.age,
        battingStyle: hasMeaningfulValue(preferredBase.battingStyle) ? preferredBase.battingStyle : secondary.battingStyle,
        bowlingStyle: hasMeaningfulValue(preferredBase.bowlingStyle) ? preferredBase.bowlingStyle : secondary.bowlingStyle,
        playingRole: hasMeaningfulValue(preferredBase.playingRole) ? preferredBase.playingRole : secondary.playingRole,
        iplTeams: mergeIplTeams(preferredBase.iplTeams, secondary.iplTeams),
        summary: hasMeaningfulValue(preferredBase.summary) ? preferredBase.summary : secondary.summary,
        battingStats: mergeBattingStats(preferredBase.battingStats, secondary.battingStats),
        bowlingStats: mergeBowlingStats(preferredBase.bowlingStats, secondary.bowlingStats),
        sourceUrl: preferredBase.sourceUrl || secondary.sourceUrl,
    };
}

function dedupeAttempts(attempts: PlayerCareerAttempt[]) {
    const attemptsByKey = new Map<string, PlayerCareerAttempt>();

    attempts.forEach((attempt) => {
        const attemptKey = `${attempt.provider}:${attempt.cacheKeys.join('|')}`;
        if (!attemptsByKey.has(attemptKey)) {
            attemptsByKey.set(attemptKey, attempt);
        }
    });

    return Array.from(attemptsByKey.values());
}

async function resolveAttempts(attempts: PlayerCareerAttempt[]) {
    const settledResults = await Promise.allSettled(
        dedupeAttempts(attempts).map(async (attempt) => ({
            attempt,
            profile: await attempt.load(),
        }))
    );

    const fulfilled = settledResults.filter(
        (result): result is PromiseFulfilledResult<{ attempt: PlayerCareerAttempt; profile: PlayerCareerProfile }> =>
            result.status === 'fulfilled'
    );
    const rejected = settledResults.filter(
        (result): result is PromiseRejectedResult => result.status === 'rejected'
    );

    if (fulfilled.length === 0) {
        return {
            profile: null,
            cacheKeys: [] as string[],
            errors: rejected.map((result) =>
                result.reason instanceof Error ? result.reason : new Error(String(result.reason))
            ),
        };
    }

    const mergedProfile = fulfilled
        .map((result) => result.value.profile)
        .reduce((bestProfile, currentProfile) => mergeProfiles(bestProfile, currentProfile));
    const cacheKeys = fulfilled.flatMap((result) => result.value.attempt.cacheKeys);

    return {
        profile: mergedProfile,
        cacheKeys,
        errors: rejected.map((result) =>
            result.reason instanceof Error ? result.reason : new Error(String(result.reason))
        ),
    };
}

async function buildFallbackAttempts(playerName: string, baseCacheKeys: string[]) {
    const asyncLookups = await Promise.allSettled([
        ENABLE_CRICBUZZ_PROVIDER ? getProfileEntries() : Promise.resolve(null),
        findEspnPlayerEntry(playerName),
    ]);
    const [cricbuzzEntriesResult, espnEntryResult] = asyncLookups;
    const attempts: PlayerCareerAttempt[] = [];
    const errors: Error[] = [];

    if (ENABLE_CRICBUZZ_PROVIDER) {
        if (cricbuzzEntriesResult.status === 'fulfilled') {
            const profileEntry = cricbuzzEntriesResult.value ? findProfileEntry(playerName, cricbuzzEntriesResult.value) : null;
            if (profileEntry) {
                attempts.push({
                    provider: 'cricbuzz',
                    cacheKeys: [...baseCacheKeys, `cricbuzz:${profileEntry.id}`],
                    load: () => fetchCricbuzzProfile(profileEntry, playerName),
                });
            }
        } else {
            errors.push(
                cricbuzzEntriesResult.reason instanceof Error
                    ? cricbuzzEntriesResult.reason
                    : new Error(String(cricbuzzEntriesResult.reason))
            );
        }
    }

    if (espnEntryResult.status === 'fulfilled') {
        if (espnEntryResult.value) {
            const espnEntry = espnEntryResult.value;
            attempts.push({
                provider: 'espn',
                cacheKeys: [...baseCacheKeys, `espn:${espnEntry.id}`],
                load: () => fetchEspnCareerProfile(espnEntry.id, playerName),
            });
        }
    } else {
        errors.push(
            espnEntryResult.reason instanceof Error
                ? espnEntryResult.reason
                : new Error(String(espnEntryResult.reason))
        );
    }

    return { attempts, errors };
}

export async function fetchPlayerCareerProfile(playerName: string): Promise<PlayerCareerProfile> {
    const registeredSource = findRegisteredPlayerSource(playerName);
    const baseCacheKeys = [
        ENABLE_CRICBUZZ_PROVIDER && registeredSource?.cricbuzz ? `cricbuzz:${registeredSource.cricbuzz.id}` : '',
        registeredSource?.espnCricinfo ? `espn:${registeredSource.espnCricinfo.id}` : '',
        slugify(playerName),
    ].filter(Boolean);

    for (const cacheKey of baseCacheKeys) {
        const cached = profileCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.profile;
        }
    }

    const directAttempts: PlayerCareerAttempt[] = [];

    if (ENABLE_CRICBUZZ_PROVIDER && registeredSource?.cricbuzz) {
        const registeredCricbuzzEntry = getRegisteredCricbuzzProfileEntry(playerName);
        if (registeredCricbuzzEntry) {
            directAttempts.push({
                provider: 'cricbuzz',
                cacheKeys: [...baseCacheKeys, `cricbuzz:${registeredCricbuzzEntry.id}`],
                load: () => fetchCricbuzzProfile(registeredCricbuzzEntry, playerName),
            });
        }
    }

    if (registeredSource?.espnCricinfo) {
        const registeredEspnSource = registeredSource.espnCricinfo;
        directAttempts.push({
            provider: 'espn',
            cacheKeys: [...baseCacheKeys, `espn:${registeredEspnSource.id}`],
            load: () => fetchEspnCareerProfile(registeredEspnSource.id, playerName),
        });
    }

    const directResult = await resolveAttempts(directAttempts);
    if (directResult.profile) {
        cacheProfile(directResult.profile, ...directResult.cacheKeys);
        return directResult.profile;
    }

    const fallback = await buildFallbackAttempts(playerName, baseCacheKeys);
    const fallbackResult = await resolveAttempts(fallback.attempts);
    if (fallbackResult.profile) {
        cacheProfile(fallbackResult.profile, ...fallbackResult.cacheKeys);
        return fallbackResult.profile;
    }

    const allErrors = [
        ...directResult.errors,
        ...fallback.errors,
        ...fallbackResult.errors,
    ];
    if (allErrors.length > 0) {
        throw allErrors[0];
    }

    throw new Error(`No public career profile found for ${playerName}`);
}
