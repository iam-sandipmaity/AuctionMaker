# Modal Popup Additions for Stats Page

## Step 1: Add modal state and fetch all players
```typescript
// Add after existing useState declarations
const [modalData, setModalData] = useState<{
    title: string;
    players: any[];
} | null>(null);
const [allPlayers, setAllPlayers] = useState<any[]>([]);

// Add fetch all players function
const fetchAllPlayers = async () => {
    try {
        const response = await fetch(`/api/players?auctionId=${auctionId}`);
        const result = await response.json();
        if (result.success) {
            setAllPlayers(result.data);
        }
    } catch (error) {
        console.error('Error fetching players:', error);
    }
};

// Update useEffect to fetch players
useEffect(() => {
    fetchStats();
    fetchAllPlayers();
}, [auctionId]);

// Add helper functions for modal
const openModal = (title: string, players: any[]) => {
    setModalData({ title, players });
};

const closeModal = () => {
    setModalData(null);
};

const showRolePlayers = (role: string) => {
    const normalizeRole = (r: string) => r?.toUpperCase().trim() || '';
    const rolePlayers = allPlayers.filter(p => {
        const normalized = normalizeRole(p.role);
        return normalized === role.toUpperCase() || 
               (role === 'ALLROUNDER' && normalized === 'ALL-ROUNDER') ||
               (role === 'WICKETKEEPER' && normalized === 'WICKET-KEEPER');
    }).map(p => ({
        name: p.name,
        role: p.role,
        price: p.soldPrice ? Number(p.soldPrice) : p.basePrice ? Number(p.basePrice) : 0,
        team: p.team?.name,
        teamColor: p.team?.color,
        status: p.status,
    }));
    openModal(`${role} Players`, rolePlayers);
};

const showTeamPlayers = (team: any) => {
    const teamPlayers = allPlayers.filter(p => p.teamId === team.id && p.status === 'SOLD').map(p => ({
        name: p.name,
        role: p.role,
        price: p.soldPrice ? Number(p.soldPrice) : 0,
        team: team.name,
        teamColor: team.color,
        status: p.status,
    }));
    openModal(`${team.name} Squad`, teamPlayers);
};

const showPriceRangePlayers = (range: string, min: number, max?: number) => {
    const players = allPlayers.filter(p => {
        if (p.status !== 'SOLD') return false;
        const price = p.soldPrice ? Number(p.soldPrice) : 0;
        if (max) return price >= min && price < max;
        return price >= min;
    }).map(p => ({
        name: p.name,
        role: p.role,
        price: p.soldPrice ? Number(p.soldPrice) : 0,
        team: p.team?.name,
        teamColor: p.team?.color,
        status: p.status,
    }));
    openModal(`${range} Players`, players);
};
```

## Step 2: Add modal JSX right after opening div in return
```jsx
{/* Modal */}
{modalData && (
    <div 
        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
        onClick={closeModal}
    >
        <div 
            className="card p-6 max-w-4xl w-full max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl md:text-3xl font-[var(--font-grotesk)] font-bold text-[var(--foreground)]">
                    {modalData.title}
                </h2>
                <button
                    onClick={closeModal}
                    className="text-[var(--foreground)] hover:text-[var(--accent)] text-3xl font-bold"
                >
                    ×
                </button>
            </div>
            
            {modalData.players.length === 0 ? (
                <p className="text-[var(--muted)] font-mono text-center py-8">No players found</p>
            ) : (
                <div className="space-y-2">
                    {modalData.players.map((player, index) => (
                        <div key={index} className="card p-4 flex justify-between items-center hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_var(--accent)] transition-all">
                            <div>
                                <div className="text-[var(--foreground)] font-[var(--font-grotesk)] font-bold">
                                    {player.name}
                                </div>
                                <div className="text-sm font-mono text-[var(--muted)] uppercase">
                                    {player.role}
                                </div>
                                {player.team && (
                                    <div className="text-sm font-mono mt-1" style={{ color: player.teamColor }}>
                                        {player.team}
                                    </div>
                                )}
                            </div>
                            <div className="text-right">
                                {player.price !== undefined && (
                                    <div className="text-lg font-bold font-mono text-[var(--accent)]">
                                        {formatCurrency(player.price)}
                                    </div>
                                )}
                                {player.status && (
                                    <div className={`text-xs font-mono uppercase ${
                                        player.status === 'SOLD' ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
                                    }`}>
                                        {player.status}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
)}
```

## Step 3: Make role cards clickable
Add to role distribution cards:
```jsx
onClick={() => showRolePlayers(role)}
className="card p-4 cursor-pointer hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[6px_6px_0_var(--accent)] transition-all"

// Add hint text
<div className="text-[var(--accent)] font-mono text-xs mt-2 text-center">👆 Click to view list</div>
```

## Step 4: Make team cards clickable
```jsx
onClick={() => showTeamPlayers(team)}
className="card p-6 cursor-pointer hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[6px_6px_0_var(--accent)] transition-all"

// Add hint
<span className="text-[var(--accent)] font-mono text-xs">👆 Click to view squad</span>
```

## Step 5: Make price range cards clickable
```jsx
onClick={() => showPriceRangePlayers('Budget', 0, 500000)}
className="card p-4 text-center cursor-pointer hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[6px_6px_0_var(--accent)] transition-all"

// Add hint
<div className="text-[var(--accent)] font-mono text-xs mt-2">👆 Click to view</div>
```
