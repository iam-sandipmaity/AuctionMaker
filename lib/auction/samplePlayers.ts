export interface SamplePlayer {
    name: string;
    description: string;
    role: string;
    basePrice: number;
    marqueeSet: number;
    previousTeamShortName: string;
    avatarUrl?: string;
}

export const samplePlayers: SamplePlayer[] = [
    { name: 'Virat Kohli', description: 'Indian top-order batsman', role: 'Batsman', basePrice: 1.5, marqueeSet: 1, previousTeamShortName: 'RCB', avatarUrl: 'https://example.com/virat_kohli.jpg' },
    { name: 'Rohit Sharma', description: 'Indian opening batsman', role: 'Batsman', basePrice: 1, marqueeSet: 2, previousTeamShortName: 'MI' },
    { name: 'MS Dhoni', description: 'Wicketkeeper batsman', role: 'Wicket-keeper', basePrice: 1, marqueeSet: 1, previousTeamShortName: 'CSK' },
    { name: 'Jasprit Bumrah', description: 'Indian fast bowler', role: 'Bowler', basePrice: 2, marqueeSet: 2, previousTeamShortName: 'MI' },
    { name: 'Ravindra Jadeja', description: 'Indian all-rounder', role: 'All-rounder', basePrice: 1.5, marqueeSet: 2, previousTeamShortName: 'CSK' },
    { name: 'Hardik Pandya', description: 'Indian all-rounder', role: 'All-rounder', basePrice: 1.5, marqueeSet: 1, previousTeamShortName: 'GT' },
    { name: 'KL Rahul', description: 'Indian wicketkeeper batsman', role: 'Wicket-keeper', basePrice: 1.5, marqueeSet: 1, previousTeamShortName: 'LSG' },
    { name: 'Shubman Gill', description: 'Indian opening batsman', role: 'Batsman', basePrice: 1.5, marqueeSet: 1, previousTeamShortName: 'GT' },
    { name: 'Rishabh Pant', description: 'Indian wicketkeeper batsman', role: 'Wicket-keeper', basePrice: 2, marqueeSet: 2, previousTeamShortName: 'DC' },
    { name: 'Mohammed Shami', description: 'Indian fast bowler', role: 'Bowler', basePrice: 2, marqueeSet: 1, previousTeamShortName: 'GT' },
    { name: 'Suryakumar Yadav', description: 'Indian middle-order batsman', role: 'Batsman', basePrice: 2, marqueeSet: 2, previousTeamShortName: 'MI' },
    { name: 'Yuzvendra Chahal', description: 'Indian leg spinner', role: 'Bowler', basePrice: 2, marqueeSet: 2, previousTeamShortName: 'RR' },
    { name: 'Sanju Samson', description: 'Indian wicketkeeper batsman', role: 'Wicket-keeper', basePrice: 1, marqueeSet: 2, previousTeamShortName: 'RR' },
    { name: 'Jos Buttler', description: 'England wicketkeeper batsman', role: 'Wicket-keeper', basePrice: 2, marqueeSet: 2, previousTeamShortName: 'RR' },
    { name: 'Ben Stokes', description: 'England all-rounder', role: 'All-rounder', basePrice: 1, marqueeSet: 2, previousTeamShortName: 'CSK' },
    { name: 'Joe Root', description: 'England batsman', role: 'Batsman', basePrice: 1, marqueeSet: 2, previousTeamShortName: 'RR' },
    { name: 'Kane Williamson', description: 'New Zealand batsman', role: 'Batsman', basePrice: 2, marqueeSet: 2, previousTeamShortName: 'SRH' },
    { name: 'Trent Boult', description: 'New Zealand fast bowler', role: 'Bowler', basePrice: 2, marqueeSet: 2, previousTeamShortName: 'RR' },
    { name: 'Mitchell Starc', description: 'Australian fast bowler', role: 'Bowler', basePrice: 2, marqueeSet: 1, previousTeamShortName: 'KKR' },
    { name: 'Pat Cummins', description: 'Australian all-rounder', role: 'All-rounder', basePrice: 1, marqueeSet: 1, previousTeamShortName: 'SRH' },
    { name: 'Glenn Maxwell', description: 'Australian all-rounder', role: 'All-rounder', basePrice: 1.5, marqueeSet: 1, previousTeamShortName: 'RCB' },
    { name: 'David Warner', description: 'Australian opening batsman', role: 'Batsman', basePrice: 1, marqueeSet: 2, previousTeamShortName: 'DC' },
    { name: 'Steve Smith', description: 'Australian batsman', role: 'Batsman', basePrice: 1, marqueeSet: 2, previousTeamShortName: 'RR' },
    { name: 'AB de Villiers', description: 'South African batsman', role: 'Batsman', basePrice: 1, marqueeSet: 1, previousTeamShortName: 'RCB' },
    { name: 'Faf du Plessis', description: 'South African batsman', role: 'Batsman', basePrice: 1, marqueeSet: 1, previousTeamShortName: 'RCB' },
    { name: 'Quinton de Kock', description: 'South African wicketkeeper', role: 'Wicket-keeper', basePrice: 1, marqueeSet: 1, previousTeamShortName: 'LSG' },
    { name: 'Kagiso Rabada', description: 'South African fast bowler', role: 'Bowler', basePrice: 1.5, marqueeSet: 1, previousTeamShortName: 'PBKS' },
    { name: 'Anrich Nortje', description: 'South African fast bowler', role: 'Bowler', basePrice: 2, marqueeSet: 1, previousTeamShortName: 'DC' },
    { name: 'Andre Russell', description: 'West Indies all-rounder', role: 'All-rounder', basePrice: 2, marqueeSet: 2, previousTeamShortName: 'KKR' },
    { name: 'Sunil Narine', description: 'West Indies spinner', role: 'Bowler', basePrice: 1.5, marqueeSet: 1, previousTeamShortName: 'KKR' },
    { name: 'Nicholas Pooran', description: 'West Indies wicketkeeper', role: 'Wicket-keeper', basePrice: 1, marqueeSet: 2, previousTeamShortName: 'LSG' },
    { name: 'Kieron Pollard', description: 'West Indies all-rounder', role: 'All-rounder', basePrice: 2, marqueeSet: 1, previousTeamShortName: 'MI' },
    { name: 'Jason Holder', description: 'West Indies all-rounder', role: 'All-rounder', basePrice: 1.5, marqueeSet: 2, previousTeamShortName: 'RR' },
    { name: 'Babar Azam', description: 'Pakistan batsman', role: 'Batsman', basePrice: 1.5, marqueeSet: 1, previousTeamShortName: 'KKR' },
    { name: 'Shaheen Afridi', description: 'Pakistan fast bowler', role: 'Bowler', basePrice: 1, marqueeSet: 1, previousTeamShortName: 'GT' },
    { name: 'Mohammad Rizwan', description: 'Pakistan wicketkeeper', role: 'Wicket-keeper', basePrice: 1.5, marqueeSet: 2, previousTeamShortName: 'CSK' },
    { name: 'Rashid Khan', description: 'Afghanistan spinner', role: 'Bowler', basePrice: 1, marqueeSet: 2, previousTeamShortName: 'GT' },
    { name: 'Mohammad Nabi', description: 'Afghanistan all-rounder', role: 'All-rounder', basePrice: 1, marqueeSet: 2, previousTeamShortName: 'SRH' },
    { name: 'Wanindu Hasaranga', description: 'Sri Lanka all-rounder', role: 'All-rounder', basePrice: 2, marqueeSet: 1, previousTeamShortName: 'RCB' },
    { name: 'Maheesh Theekshana', description: 'Sri Lanka spinner', role: 'Bowler', basePrice: 1.5, marqueeSet: 1, previousTeamShortName: 'CSK' },
    { name: 'Shakib Al Hasan', description: 'Bangladesh all-rounder', role: 'All-rounder', basePrice: 1.5, marqueeSet: 2, previousTeamShortName: 'KKR' },
    { name: 'Mustafizur Rahman', description: 'Bangladesh fast bowler', role: 'Bowler', basePrice: 1, marqueeSet: 2, previousTeamShortName: 'DC' },
    { name: 'Devdutt Padikkal', description: 'Indian batsman', role: 'Batsman', basePrice: 1.5, marqueeSet: 1, previousTeamShortName: 'RR' },
    { name: 'Prithvi Shaw', description: 'Indian batsman', role: 'Batsman', basePrice: 2, marqueeSet: 1, previousTeamShortName: 'DC' },
    { name: 'Ishan Kishan', description: 'Indian wicketkeeper', role: 'Wicket-keeper', basePrice: 2, marqueeSet: 2, previousTeamShortName: 'MI' },
    { name: 'Axar Patel', description: 'Indian all-rounder', role: 'All-rounder', basePrice: 1, marqueeSet: 1, previousTeamShortName: 'DC' },
    { name: 'Kuldeep Yadav', description: 'Indian spinner', role: 'Bowler', basePrice: 1.5, marqueeSet: 2, previousTeamShortName: 'DC' },
    { name: 'Deepak Chahar', description: 'Indian fast bowler', role: 'Bowler', basePrice: 1.5, marqueeSet: 2, previousTeamShortName: 'CSK' },
    { name: 'Bhuvneshwar Kumar', description: 'Indian fast bowler', role: 'Bowler', basePrice: 1.5, marqueeSet: 2, previousTeamShortName: 'SRH' },
    { name: 'Tilak Varma', description: 'Indian batsman', role: 'Batsman', basePrice: 1.5, marqueeSet: 1, previousTeamShortName: 'MI' },
    { name: 'Glenn Phillips', description: 'New Zealand power-hitting all-rounder', role: 'All-rounder', basePrice: 1, marqueeSet: 3, previousTeamShortName: 'none' },
];

function escapeCsvValue(value: string | number | undefined) {
    if (value === undefined) {
        return '';
    }

    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
}

export function buildSamplePlayersCsv() {
    const headers = [
        'name',
        'description',
        'role',
        'base price',
        'avatar url',
        'marquee set',
        'previous team short name',
    ];

    const rows = samplePlayers.map((player) => [
        player.name,
        player.description,
        player.role,
        player.basePrice,
        player.avatarUrl ?? '',
        player.marqueeSet,
        player.previousTeamShortName,
    ]);

    return [
        headers.join(','),
        ...rows.map((row) => row.map((value) => escapeCsvValue(value)).join(',')),
    ].join('\n');
}
