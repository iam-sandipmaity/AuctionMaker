# AuctionMaker - Real-Time Auction Bidding Platform

A fully customizable, real-time multi-user auction bidding platform supporting both traditional product auctions and IPL-style team player auctions. Built with Next.js, PostgreSQL, and a retro brutalist design aesthetic.

## Features

### General Features
- 🔴 **Real-time bidding** with auto-refresh updates
- 👥 **Multi-user support** with concurrent bidding
- 💰 **Budget management** and tracking
- ⏱️ **Countdown timers** with auto-close
- 🔐 **Secure authentication** with NextAuth.js
- 🎨 **Brutalist design** with retro terminal aesthetic
- 📱 **Mobile-responsive** layout
- 🛠️ **Admin dashboard** for auction creation

### IPL-Style Team Auctions (NEW!)
- 🏏 **Team-based bidding** - Multiple teams compete for players
- 🎯 **Auctioneer control** - Admin manages live auction flow
- 👤 **Player management** - Add players with roles, base prices
- 🏆 **Squad building** - Teams build squads within budget limits
- 📊 **Real-time stats** - Track budgets, squad sizes, bids
- 🎨 **Team branding** - Custom colors and logos for teams
- ⚡ **Live auction control** - Start/stop player auctions dynamically

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
- **Real-time**: Polling-based updates (Socket.IO ready)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with JWT
- **Validation**: Zod

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
   
   Copy `.env.example` to `.env` and update with your values:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/auction_db"
   NEXTAUTH_SECRET="your-secret-key-change-this-in-production"
   NEXTAUTH_URL="http://localhost:3000"
   ```

4. **Set up the database**
   ```bash
   npm run db:push
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
   - Team budget (e.g., 100 Crores)
   - Squad size requirements
   - Base price and bid increment
4. Create auction
5. **Add Teams**: Configure 4-10 teams with names, colors
6. **Add Players**: Add players with roles and base prices
7. **Start Auction**: Begin when ready
8. **Run Auction**: 
   - Select player to auction
   - Teams bid in real-time
   - Mark player as sold/unsold
   - Continue for all players

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

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `NEXTAUTH_SECRET` | Secret for JWT signing | Random string (generate with `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Application URL | `http://localhost:3000` |

## Features in Detail

### Real-Time Bidding
- WebSocket connections for instant updates
- Live activity feed showing all bids
- Automatic price updates across all clients

### Wallet System
- Initial budget on registration
- Real-time balance tracking
- Bid validation against available funds

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

- Server-side rendering for SEO
- Optimistic UI updates
- Efficient database queries with Prisma
- WebSocket connection pooling

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
