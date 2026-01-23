# IPL Auction - Quick Start Guide

## Getting Started

### Prerequisites
- Database has been reset and schema is up to date
- Server is running (`npm run dev`)
- You have admin access (registered user)

### New Features (January 23, 2026)
- ✨ **Advanced Analytics Dashboard** with 15+ visualization sections
- 📊 **Interactive Charts**: Heatmaps, stacked bars, budget utilization rings
- 🎯 **Random Player Selection** for fair picks
- 📈 **Performance Scorecards** with A-F grading
- ⚠️ **Risk Alerts** and completion forecasts
- 💡 **Smart Insights** auto-generation
- 🎨 **Improved UI** with better color contrast

## Step-by-Step Guide for Admin

### 1. Create IPL Auction

1. Navigate to `/admin` page
2. Fill in auction details:
   - **Title**: "IPL 2024 Mega Auction"
   - **Description**: "Annual player auction for IPL teams"
   - **Auction Type**: Select "IPL Style Team Auction"
   - **Team Budget**: 100 (Crores)
   - **Currency**: INR
   - **Budget Denomination**: Crores
   - **Min Squad Size**: 11
   - **Max Squad Size**: 15
   - **Base Price**: 0.20 (default starting bid)
   - **Bid Increment**: 0.05
   - **Duration**: 300 minutes (5 hours)
   - **Max Teams**: 8
3. Click "CREATE AUCTION"

### 2. Add Teams

You'll be redirected to the auction page. Click "TEAMS" tab:

**Suggested Teams:**
1. **Mumbai Indians**
   - Short Name: MI
   - Color: #004BA0 (Blue)
   
2. **Chennai Super Kings**
   - Short Name: CSK
   - Color: #FDB913 (Yellow)
   
3. **Royal Challengers Bangalore**
   - Short Name: RCB
   - Color: #EC1C24 (Red)
   
4. **Kolkata Knight Riders**
   - Short Name: KKR
   - Color: #3A225D (Purple)
   
5. **Delhi Capitals**
   - Short Name: DC
   - Color: #004C93 (Navy Blue)
   
6. **Rajasthan Royals**
   - Short Name: RR
   - Color: #EA1A85 (Pink)
   
7. **Sunrisers Hyderabad**
   - Short Name: SRH
   - Color: #FF822A (Orange)
   
8. **Punjab Kings**
   - Short Name: PBKS
   - Color: #DD1F2D (Red)

### 3. Add Players

Click "PLAYERS" tab and add players:

**Example Players:**

**Batsmen:**
1. **Virat Kohli**
   - Role: Batsman
   - Base Price: 2.00 Crores
   - Description: "Star batsman, former captain, aggressive player"

2. **Rohit Sharma**
   - Role: Batsman
   - Base Price: 2.00 Crores
   - Description: "Opening batsman, current MI captain"

**Bowlers:**
3. **Jasprit Bumrah**
   - Role: Bowler
   - Base Price: 2.00 Crores
   - Description: "Fast bowler, death over specialist"

4. **Rashid Khan**
   - Role: Bowler
   - Base Price: 1.50 Crores
   - Description: "Leg-spinner from Afghanistan, economical"

**All-rounders:**
5. **Hardik Pandya**
   - Role: All-rounder
   - Base Price: 2.00 Crores
   - Description: "Hard-hitting batsman and medium-pace bowler"

6. **Ravindra Jadeja**
   - Role: All-rounder
   - Base Price: 1.50 Crores
   - Description: "Left-arm spinner and useful lower-order batsman"

**Wicket-keepers:**
7. **Rishabh Pant**
   - Role: Wicket-keeper
   - Base Price: 2.00 Crores
   - Description: "Attacking wicket-keeper batsman"

8. **MS Dhoni**
   - Role: Wicket-keeper
   - Base Price: 2.00 Crores
   - Description: "Former India captain, finisher extraordinaire"

*(Add 10-20 more players as needed)*

### 4. Start the Auction

Once teams and players are added:
1. You'll see a "Ready to Start Auction" message
2. Click the **"🎯 START AUCTION"** button
3. Auction status changes to LIVE

### 5. Run the Auction

Now you'll see the **Auctioneer Control Panel**:

**For Each Player:**
1. Click **"START"** on a player from the "Next Players" list
2. Player appears in the "Currently Auctioning" section
3. Teams will start bidding
4. Watch the highest bid update in real-time
5. When bidding is done, choose:
   - **"✓ SOLD"** - Player goes to highest bidder
   - **"UNSOLD"** - Player remains unsold
6. Repeat for all players

## Step-by-Step Guide for Team Users

### 1. Join Auction

1. Navigate to the auction page URL (shared by admin)
2. Log in with your account
3. You'll see the "SELECT YOUR TEAM" page

### 2. Choose Your Team

1. Select an available team (not already taken)
2. Click **"JOIN TEAM"**
3. Wait for admin to start the auction

### 3. Participate in Bidding

Once auction is LIVE:

1. **Monitor Current Player**
   - See player name, role, description
   - View current highest bid

2. **Place Your Bids**
   - Enter bid amount in the sidebar
   - Must be at least: Current Bid + Increment
   - Must not exceed your team's budget
   - Click **"🔨 PLACE BID"**

3. **Track Your Team**
   - View remaining budget
   - See acquired players count
   - Monitor other teams' budgets

### 4. Strategy Tips

- **Budget Management**: Don't overspend early - check analytics dashboard
- **Squad Balance**: Need players across all roles - monitor balance scorecard
- **Quick Bidding**: React fast to player you want
- **Watch Competitors**: Track other teams' budgets and risk indicators
- **Min Squad Size**: Must acquire at least 11 players - use completion forecast
- **Value Hunting**: Check "Value Analysis" section for bargain opportunities
- **Risk Monitoring**: Watch for budget crisis alerts in Risk Dashboard
- **Performance Tracking**: Review your team's grade in Performance Scorecard

### 5. Analytics & Insights

Access comprehensive analytics during and after auction:

1. **Click "ANALYTICS" tab** to view:
   - Top Insights Summary with key takeaways
   - Team Spending Heatmap (role-wise intensity)
   - Budget Utilization Rings
   - Risk & Opportunity Dashboard
   - Completion Forecast
   - Performance Scorecard (A-F grades)
   - Value Analysis (bargains vs premium buys)
   - 10+ more visualization sections

2. **Export Options**:
   - Export as PNG for presentations
   - Export as PDF for reports
   - Share insights with team management

## Common Scenarios

### Scenario 1: Competitive Bidding
```
Player: Virat Kohli (Base: 2.00 Crores)
- MI bids: 2.00
- CSK bids: 2.50
- MI bids: 3.00
- CSK bids: 3.50
- Admin: "SOLD to CSK for 3.50 Crores"
```

### Scenario 2: No Interest
```
Player: Unknown Player (Base: 0.20 Crores)
- No bids after 30 seconds
- Admin: Marks as "UNSOLD"
```

### Scenario 3: Budget Exhausted
```
Team: RCB
- Budget: 5.00 Crores remaining
- Tries to bid: 6.00 Crores
- Error: "Insufficient budget"
```

## Troubleshooting

### "Cannot join team - already taken"
- Someone else joined that team first
- Choose a different available team

### "Insufficient budget" error
- Your team doesn't have enough money
- Lower your bid or skip this player

### "Minimum bid is X" error
- Your bid is too low
- Must bid at least: Current High Bid + Increment

### Player not appearing in auction
- Admin hasn't started auctioning that player yet
- Wait for admin to select the player

## Admin Tips

1. **Prepare in Advance**: Add all teams and players before starting
2. **Communicate**: Share auction URL with team users
3. **Timing**: Give 30-60 seconds for bidding per player
4. **Unsold Players**: Can re-auction later if desired
5. **Monitor Budgets**: Ensure teams can complete minimum squad
6. **Final Check**: Verify all teams have minimum required players

## Features at a Glance

✅ **Admin Controls**
- Complete auctioneer powers
- Start/stop player auctions
- Mark players as sold/unsold
- Real-time bid monitoring

✅ **Team Bidding**
- One user per team
- Budget tracking
- Squad size management
- Real-time updates

✅ **Validations**
- Budget checks
- Minimum bid enforcement
- Squad size limits
- Team assignment rules

✅ **User Experience**
- Color-coded teams
- Mobile responsive
- Clear status indicators
- Comprehensive stats

## Example Complete Auction Flow

1. **Admin**: Creates "IPL 2024" auction
2. **Admin**: Adds 8 teams (MI, CSK, RCB, KKR, DC, RR, SRH, PBKS)
3. **Admin**: Adds 20 players across roles
4. **Users**: 8 users join, each selecting one team
5. **Admin**: Clicks "START AUCTION"
6. **Admin**: Starts first player (Virat Kohli)
7. **Teams**: MI bids 2.0, RCB bids 2.5, MI bids 3.0
8. **Admin**: Marks as "SOLD to MI for 3.0 Crores"
9. **System**: Updates MI budget (97.0 remaining), squad size (1)
10. **Repeat steps 6-9 for all 20 players**
11. **Result**: 8 teams with complete squads

## Need Help?

- Check the main auction page for real-time stats
- Admin has full visibility of all teams and budgets
- Teams can see their current squad and budget at all times
- All actions are validated to prevent errors

Happy Auctioning! 🎯🏏
