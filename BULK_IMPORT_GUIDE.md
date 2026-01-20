# Bulk Player Import Guide

## Overview
You can import multiple players at once using CSV or JSON files. This is perfect for setting up large player pools quickly.

## File Formats

### CSV Format
Create a CSV file with the following columns:

```csv
name,description,role,base price,avatar url,marquee set
Virat Kohli,Indian cricket captain,Batsman,2000000,https://example.com/virat.jpg,1
Jasprit Bumrah,Fast bowler,Bowler,1800000,,1
Ravindra Jadeja,All-rounder,All-rounder,1500000,,2
Hardik Pandya,All-rounder,All-rounder,1200000,,2
Rishabh Pant,Wicket-keeper batsman,Wicket-keeper,1000000,,3
```

**Column Headers (flexible naming):**
- `name` / `player name` / `playername` - **REQUIRED**
- `description` / `desc`
- `role` / `position` / `type` / `player type`
- `base price` / `baseprice` / `price` / `starting price` / `bid start` - **REQUIRED**
- `avatar url` / `avatarurl` / `avatar` / `image`
- `marquee set` / `marqueeset` / `marquee` / `tier` / `set`

### JSON Format
Create a JSON file with an array of player objects:

```json
[
  {
    "name": "Virat Kohli",
    "description": "Indian cricket captain",
    "role": "Batsman",
    "basePrice": 2000000,
    "avatarUrl": "https://example.com/virat.jpg",
    "marqueeSet": 1
  },
  {
    "name": "Jasprit Bumrah",
    "description": "Fast bowler",
    "role": "Bowler",
    "basePrice": 1800000,
    "marqueeSet": 1
  }
]
```

**JSON Fields:**
- `name` - **REQUIRED** - Player name
- `description` - Optional - Player details/stats
- `role` - Optional - Position (Batsman/Bowler/All-rounder/Wicket-keeper)
- `basePrice` - **REQUIRED** - Starting bid price (number)
- `avatarUrl` - Optional - Player photo URL
- `marqueeSet` - Optional - Tier level (1-5, default: 5)

## Marquee Set Tiers

Players are automatically sorted by their marquee tier during auction:

- **Set 1** - Marquee players (Top tier, highest priority)
- **Set 2** - Star players
- **Set 3** - Established players
- **Set 4** - Emerging players
- **Set 5** - Uncapped/New players (Default if not specified)

## Player Roles

Valid role values:
- `Batsman`
- `Bowler`
- `All-rounder`
- `Wicket-keeper`

## How to Import

1. **Create your file** - Use CSV or JSON format with player data
2. **Go to Admin Panel** - Navigate to your auction's admin page
3. **Click "BULK IMPORT"** button
4. **Download sample files** (optional) - Use sample CSV/JSON as reference
5. **Upload your file** - Select your CSV or JSON file
6. **Click "IMPORT PLAYERS"** - Players will be added and sorted by marquee tier

## Validation Rules

- **Name** must not be empty
- **Base price** must be a positive number
- **Marquee set** must be between 1-5 (if provided)
- All validation errors will be shown if upload fails

## Tips

- Leave `avatarUrl` empty if you don't have player photos
- Use `marqueeSet` to control auction order (top players first)
- CSV is easier for spreadsheet tools (Excel, Google Sheets)
- JSON is better for programmatic generation
- Download sample files from the UI to see exact format

## Example Use Cases

### Small League (20 players)
Use manual entry or small CSV file

### IPL-style League (100+ players)
1. Prepare Excel sheet with all player data
2. Export as CSV
3. Bulk import to save time

### International T20 League
1. Set marquee tiers:
   - Set 1: International stars (10 players)
   - Set 2: Experienced players (20 players)
   - Set 3-5: Domestic/emerging players (70 players)
2. Import all at once
3. Auction automatically proceeds tier by tier
