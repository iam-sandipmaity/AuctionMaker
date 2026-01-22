# AuctionMaker - Real-Time Auction Bidding Platform

A fully customizable, real-time multi-user auction bidding platform supporting both traditional product auctions and IPL-style team player auctions. Built with Next.js, PostgreSQL, and a retro brutalist design aesthetic.

## Features

### General Features
- 🔴 **Real-time bidding** with auto-refresh updates
- 👥 **Multi-user support** with concurrent bidding
- 💰 **Budget management** with multi-currency support (USD, INR, EUR, GBP)
- 💵 **Flexible denominations** - Crores, Lakhs, Million, Thousand
- ⏱️ **Countdown timers** with auto-close
- 🔐 **Secure authentication** with NextAuth.js
- 🎨 **Brutalist design** with retro terminal aesthetic
- 📱 **Fully responsive** - Mobile, Tablet, Desktop optimized
- 🛠️ **Admin dashboard** for auction creation
- 📊 **Advanced analytics** with comprehensive auction insights
- 📤 **Export functionality** - Download stats as PDF/Excel
- 🔔 **Toast notifications** for real-time feedback
- 🚀 **Performance optimized** with ISR caching and lazy loading
- 🛡️ **Error boundaries** for graceful error handling

### IPL-Style Team Auctions
- 🏏 **Team-based bidding** - Multiple teams compete for players
- 🎯 **Auctioneer control** - Admin manages live auction flow
- 👤 **Player management** - Add players with roles, base prices, marquee tiers
- 🏆 **Squad building** - Teams build squads within budget limits
- 📊 **Real-time stats** - Track budgets, squad sizes, bids with live updates
- 🎨 **Team branding** - Custom colors and logos for teams
- ⚡ **Live auction control** - Start/stop player auctions dynamically
- ⭐ **Star player marking** - Highlight priority/marquee players
- 🔄 **Auction history** - Track which players have been auctioned
- 🎯 **Player interests** - Teams can mark players of interest
- 📈 **Advanced analytics** - Role distribution, spending patterns, team composition
- 🖨️ **Exportable reports** - Generate PDF/Excel reports with pagination

### Two Auction Modes

#### 1. Product Auction (Traditional)
- Standard bidding on products/items/services
- Highest bidder wins at auction end
- Wallet-based budget system
- Activity feed with bid history

#### 2. Team Auction (IPL Style)
- Admin acts as auctioneer
- Teams join and bid on players
- Admin adds players one by one during auction
- Real-time budget and squad tracking
- Player sold/unsold decisions by auctioneer

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS with custom brutalist theme
- **Backend**: Next.js API Routes
- **Real-time**: Polling-based updates with ISR caching
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with JWT sessions
- **Validation**: Zod schema validation
- **Performance**: Incremental Static Regeneration (ISR), lazy loading
- **UI Components**: Custom brutalist components with error boundaries
- **Notifications**: Toast notification system
- **Analytics**: Built-in comprehensive auction analytics
- **Export**: PDF/Excel generation with A4 pagination

## Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   cd AuctionMaker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/auction_db"
   DIRECT_URL="postgresql://user:password@localhost:5432/auction_db"
   NEXTAUTH_SECRET="your-secret-key-change-this-in-production"
   NEXTAUTH_URL="http://localhost:3000"
   ```
   
   Generate a secure secret:
   ```bash
   openssl rand -base64 32
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   ```
   
   To reset the database (deletes all data):
   ```bash
   npx prisma migrate reset --force
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
AuctionMaker/
├── app/                      # Next.js App Router pages
│   ├── api/                  # API routes
│   │   ├── auth/            # Authentication endpoints
│   │   ├── auctions/        # Auction CRUD
│   │   ├── bids/            # Bid placement
│   │   ├── teams/           # Team management (IPL)
│   │   ├── players/         # Player management (IPL)
│   │   └── auction-control/ # Live auction control (IPL)
│   ├── auction/             # Auction pages
│   │   ├── [auctionId]/    # Individual auction room
│   │   └── page.tsx         # Auction hub
│   ├── admin/               # Admin dashboard
│   ├── login/               # Login page
│   ├── register/            # Registration page
│   └── page.tsx             # Landing page
├── components/              # React components
│   ├── ui/                  # Reusable UI components
│   ├── auction/             # Auction-specific components
│   │   ├── AuctionRoomClient.tsx           # Product auction
│   │   ├── TeamAuctionRoomClient.tsx       # IPL auction
│   │   ├── AuctioneerControlPanel.tsx      # Auctioneer UI
│   │   ├── AdminTeamManager.tsx            # Team setup
│   │   └── AdminPlayerManager.tsx          # Player setup
│   └── layout/              # Layout components
├── lib/                     # Utilities and helpers
│   ├── db/                  # Database queries
│   └── auction/             # Auction business logic
├── types/                   # TypeScript type definitions
├── prisma/                  # Prisma schema
│   └── schema.prisma        # Database models (Team, Player, etc.)
└── public/                  # Static assets
```

## Usage

### Creating an Account

1. Click "REGISTER" in the header
2. Fill in your details
3. Submit the form to create your account

### Creating a Product Auction

1. Log in and go to the Admin panel (`/admin`)
2. Select "Product Auction"
3. Fill in auction details
4. Set starting price and minimum increment
5. Create and share the auction link

### Creating an IPL-Style Team Auction

1. Log in and go to the Admin panel (`/admin`)
2. Select "IPL Style Team Auction"
3. Configure:
   - Currency (USD, INR, EUR, GBP)
   - Budget denomination (Crores, Lakhs, Million, Thousand)
   - Team budget (e.g., 100 Crores for INR)
   - Squad size requirements (min/max)
   - Base price and bid increment
4. Create auction
5. **Add Teams**: Configure 4-10 teams with:
   - Team name and short name
   - Brand color (hex code)
   - Logo URL (optional)
   - Budget allocation
6. **Add Players**: Add players with:
   - Name, description, role
   - Base price in selected currency
   - Marquee tier (1-5, optional)
   - Star player marking
   - Avatar/image URL
7. **Start Auction**: Begin when teams are ready
8. **Run Auction**: 
   - Select player to auction from pool
   - Filter by marquee tier, role, or auction status
   - Teams bid in real-time with denomination display
   - Mark player as sold/unsold
   - Track spending and squad composition
   - View live analytics
9. **Export Results**: Download comprehensive reports

For detailed step-by-step guide, see [IPL_AUCTION_QUICKSTART.md](IPL_AUCTION_QUICKSTART.md)

### Joining an Auction

1. Navigate to the "AUCTIONS" page
2. Browse live, upcoming, or completed auctions
3. Click on an auction to enter the room

### Placing Bids

1. In an auction room, enter your bid amount
2. Ensure it meets the minimum bid requirement
3. Click "PLACE BID" to submit
4. Watch the live activity feed for updates

### Creating an Auction (Admin)

1. Navigate to the "ADMIN" page
2. Fill in the auction details:
   - Title and description
   - Starting price and minimum increment
   - Duration in minutes
   - Optional: max participants
3. Submit to create a live auction

## Database Schema

### User
- Wallet balance and budget tracking
- Authentication credentials
- Bid history

### Auction
- Title, description, and pricing
- Start/end times and status
- Winner tracking
- Participant limits

### Bid
- Amount and timestamp
- User and auction relationships
- Winning status

## Customization

### Design Theme

Edit `app/globals.css` to customize:
- Colors (accent color, background, foreground)
- Typography (fonts, sizes)
- Spacing and borders
- Animations

### Tailwind Configuration

Modify `tailwind.config.ts` for:
- Custom color palette
- Font families
- Spacing scale
- Border widths

## Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:studio` - Open Prisma Studio
- `npx prisma migrate reset --force` - Reset database (deletes all data)

### Utility Scripts

- `tsx scripts/check-auction-denomination.ts` - Check and fix auction denominations
- `tsx scripts/check-denominations.ts` - Verify denomination data
- `tsx scripts/update-budget-denomination.ts` - Migrate budget denominations

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string (pooled) | `postgresql://user:pass@host:5432/db` |
| `DIRECT_URL` | Direct PostgreSQL connection (for migrations) | `postgresql://user:pass@host:5432/db` |
| `NEXTAUTH_SECRET` | Secret for JWT signing | Random string (generate with `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Application URL | `http://localhost:3000` or production URL |

## Features in Detail

### Real-Time Bidding
- Polling-based updates with optimized intervals
- Live activity feed showing all bids
- Automatic price updates across all clients
- Toast notifications for bid confirmations

### Multi-Currency Support
- Support for USD, INR, EUR, GBP
- Flexible budget denominations:
  - **Crores** (1 Crore = 10 Million)
  - **Lakhs** (1 Lakh = 100 Thousand)
  - **Million** (1,000,000)
  - **Thousand** (1,000)
- Automatic denomination defaults based on currency
- Display formatting with proper separators

### Advanced Analytics Dashboard
- **Auction Overview**: Total players, sold/unsold, revenue
- **Team Performance**: Spending analysis, squad composition
- **Player Statistics**: Role distribution, price ranges
- **Visual Charts**: Budget utilization, spending patterns
- **Export Options**: PDF and Excel with A4 pagination
- **Interactive Modals**: Detailed player and team information

### Auction States
- **UPCOMING**: Not yet started
- **LIVE**: Active bidding
- **ENDED**: Completed with winner

### User Status
- **WINNING**: Current highest bidder
- **OUTBID**: Previously highest, now outbid
- **ACTIVE**: Participating but not winning

## Security

- Password hashing with bcrypt
- JWT-based authentication
- Server-side bid validation
- Protected API routes

## Performance

- **ISR (Incremental Static Regeneration)**: Cached pages with 30-60s revalidation
- **Lazy Loading**: Heavy components loaded on-demand
- **Server-side rendering**: SEO-friendly pages
- **Optimistic UI updates**: Instant feedback with rollback
- **Efficient queries**: Prisma with proper indexing
- **Connection pooling**: PostgreSQL with direct/pooled URLs
- **Code splitting**: Automatic with Next.js 15
- **Image optimization**: Next.js Image component
- **Error boundaries**: Graceful degradation
- **Loading states**: Skeleton screens and spinners

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

This is a demonstration project. Feel free to fork and customize for your needs.

## License

MIT

## Support

For issues or questions, please open an issue on the repository.

---

Built with ❤️ using Next.js and Socket.IO
