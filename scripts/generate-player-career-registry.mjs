import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const outputPath = path.join(projectRoot, 'lib', 'auction', 'playerCareerRegistry.generated.json');

const CRICBUZZ_SITEMAP_URL = 'https://www.cricbuzz.com/sitemap/cricket-player-profile.xml';
const ESPN_SEARCH_URL = 'https://stats.espncricinfo.com/ci/engine/stats/analysis.html?search=';
const FETCH_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
};
const MIN_REGISTRY_COUNT = 1000;
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

function normalizeLookupKey(value) {
    return value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/['\u2019.]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function toDisplayNameFromSlug(slug) {
    return slug
        .split('-')
        .filter(Boolean)
        .map((part) => {
            if (part.length <= 3 && /^[a-z0-9]+$/i.test(part)) {
                return part.toUpperCase();
            }
            return part.charAt(0).toUpperCase() + part.slice(1);
        })
        .join(' ');
}

async function fetchText(url) {
    const response = await fetch(url, { headers: FETCH_HEADERS });
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url} (${response.status})`);
    }

    return response.text();
}

async function fetchCricbuzzEntries() {
    const xml = await fetchText(CRICBUZZ_SITEMAP_URL);
    return Array.from(xml.matchAll(/<loc>https:\/\/www\.cricbuzz\.com\/profiles\/(\d+)\/([^<]+)<\/loc>/g)).map((match) => ({
        name: toDisplayNameFromSlug(match[2]),
        cricbuzz: {
            id: match[1],
            slug: match[2],
        },
    }));
}

async function fetchEspnEntriesForQuery(query) {
    const html = await fetchText(`${ESPN_SEARCH_URL}${encodeURIComponent(query)}`);
    const rowRegex = /<td><span style="white-space: nowrap">([^<]+)<\/span>(?:\s*<span style="white-space: nowrap">\(([^<]+)\)<\/span>)?<\/td>[\s\S]*?\/ci\/engine\/player\/(\d+)\.html/gi;
    const results = [];

    for (const match of html.matchAll(rowRegex)) {
        const displayName = (match[2] || match[1] || '').trim();
        if (!displayName) {
            continue;
        }

        results.push({
            name: displayName,
            espnCricinfo: {
                id: match[3],
            },
        });
    }

    return Array.from(new Map(results.map((entry) => [entry.espnCricinfo.id, entry])).values());
}

async function fetchEspnEntries() {
    const queries = LETTERS.split('');
    const entriesById = new Map();

    for (const query of queries) {
        const entries = await fetchEspnEntriesForQuery(query);
        for (const entry of entries) {
            entriesById.set(entry.espnCricinfo.id, entry);
        }
    }

    if (entriesById.size < MIN_REGISTRY_COUNT) {
        for (const first of LETTERS) {
            for (const second of LETTERS) {
                const query = `${first}${second}`;
                const entries = await fetchEspnEntriesForQuery(query);
                for (const entry of entries) {
                    entriesById.set(entry.espnCricinfo.id, entry);
                }

                if (entriesById.size >= MIN_REGISTRY_COUNT) {
                    break;
                }
            }

            if (entriesById.size >= MIN_REGISTRY_COUNT) {
                break;
            }
        }
    }

    return Array.from(entriesById.values());
}

function mergeEntries(cricbuzzEntries, espnEntries) {
    const merged = new Map();

    for (const entry of [...cricbuzzEntries, ...espnEntries]) {
        const key = normalizeLookupKey(entry.name);
        const existing = merged.get(key);

        if (existing) {
            merged.set(key, {
                ...existing,
                ...entry,
                cricbuzz: entry.cricbuzz || existing.cricbuzz,
                espnCricinfo: entry.espnCricinfo || existing.espnCricinfo,
            });
            continue;
        }

        merged.set(key, entry);
    }

    return Array.from(merged.values()).sort((left, right) => left.name.localeCompare(right.name));
}

async function enrichMissingEspnEntries(entries) {
    const enrichedEntries = [];
    let enrichedCount = 0;

    for (const entry of entries) {
        if (entry.espnCricinfo || !entry.cricbuzz) {
            enrichedEntries.push(entry);
            continue;
        }

        try {
            const exactMatches = await fetchEspnEntriesForQuery(entry.name);
            const normalizedName = normalizeLookupKey(entry.name);
            const matchedEspnEntry = exactMatches.find((candidate) => normalizeLookupKey(candidate.name) === normalizedName);

            if (matchedEspnEntry?.espnCricinfo?.id) {
                enrichedEntries.push({
                    ...entry,
                    espnCricinfo: {
                        id: matchedEspnEntry.espnCricinfo.id,
                    },
                });
                enrichedCount += 1;
                continue;
            }
        } catch (error) {
            console.warn(`Could not enrich ESPN id for ${entry.name}: ${error instanceof Error ? error.message : String(error)}`);
        }

        enrichedEntries.push(entry);
    }

    return {
        entries: enrichedEntries,
        enrichedCount,
    };
}

async function main() {
    const [cricbuzzEntries, espnEntries] = await Promise.all([
        fetchCricbuzzEntries(),
        fetchEspnEntries(),
    ]);

    const mergedEntries = mergeEntries(cricbuzzEntries, espnEntries);
    const enrichmentResult = await enrichMissingEspnEntries(mergedEntries);
    const finalEntries = enrichmentResult.entries;

    if (finalEntries.length < MIN_REGISTRY_COUNT) {
        throw new Error(`Expected at least ${MIN_REGISTRY_COUNT} merged players, received ${finalEntries.length}`);
    }

    await writeFile(outputPath, `${JSON.stringify(finalEntries, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${finalEntries.length} player registry entries to ${outputPath}`);
    console.log(`Cricbuzz entries: ${cricbuzzEntries.length}`);
    console.log(`ESPN entries: ${espnEntries.length}`);
    console.log(`ESPN ids enriched from exact-name lookup: ${enrichmentResult.enrichedCount}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
