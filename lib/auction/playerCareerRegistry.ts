import generatedRegistry from '@/lib/auction/playerCareerRegistry.generated.json';

export type PlayerSourceRegistryEntry = {
    name: string;
    aliases?: string[];
    cricbuzz?: {
        id: string;
        slug: string;
    };
    espnCricinfo?: {
        id: string;
    };
};

function normalizeLookupKey(value: string) {
    return value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/['\u2019.]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

const generatedEntries = generatedRegistry as PlayerSourceRegistryEntry[];

const manualRegistryEntries: PlayerSourceRegistryEntry[] = [
    {
        name: 'Babar Azam',
        aliases: ['Mohammad Babar Azam'],
        cricbuzz: {
            id: '8359',
            slug: 'babar-azam',
        },
        espnCricinfo: {
            id: '348144',
        },
    },
    {
        name: 'Andre Russell',
        aliases: ['AD Russell', 'Andre Dwayne Russell'],
        cricbuzz: {
            id: '7736',
            slug: 'andre-russel',
        },
        espnCricinfo: {
            id: '276298',
        },
    },
    {
        name: 'Sikandar Raza',
        aliases: ['Sikandar Raja'],
        espnCricinfo: {
            id: '299572',
        },
    },
];

export const PLAYER_SOURCE_REGISTRY: PlayerSourceRegistryEntry[] = [
    ...manualRegistryEntries,
    ...generatedEntries.filter((generatedEntry) => {
        const normalizedGeneratedName = normalizeLookupKey(generatedEntry.name);
        return !manualRegistryEntries.some((manualEntry) => normalizeLookupKey(manualEntry.name) === normalizedGeneratedName);
    }),
];

const registryByLookupKey = new Map<string, PlayerSourceRegistryEntry>();

for (const entry of PLAYER_SOURCE_REGISTRY) {
    for (const value of [entry.name, ...(entry.aliases || [])]) {
        const normalized = normalizeLookupKey(value);
        if (normalized) {
            registryByLookupKey.set(normalized, entry);
        }
    }
}

export function findRegisteredPlayerSource(playerName: string) {
    return registryByLookupKey.get(normalizeLookupKey(playerName)) || null;
}

export function buildCricbuzzProfileUrl(cricbuzz: { id: string; slug: string }) {
    return `https://www.cricbuzz.com/profiles/${cricbuzz.id}/${cricbuzz.slug}`;
}

export function buildEspnCricinfoProfileUrl(espnCricinfo: { id: string }, slug?: string) {
    if (slug) {
        return `https://www.espncricinfo.com/cricketers/${slug}-${espnCricinfo.id}`;
    }

    return `https://www.espncricinfo.com/ci/content/player/${espnCricinfo.id}.html`;
}
