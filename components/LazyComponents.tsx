import dynamic from 'next/dynamic';
import Loading from '@/components/ui/Loading';

// Lazy load heavy auction components
export const TeamAuctionRoomClient = dynamic(
    () => import('@/components/auction/TeamAuctionRoomClient'),
    {
        loading: () => <Loading size="lg" text="Loading auction room..." />
    }
);

export const AuctionRoomClient = dynamic(
    () => import('@/components/auction/AuctionRoomClient'),
    {
        loading: () => <Loading size="lg" text="Loading auction room..." />
    }
);

export const AdminTeamManager = dynamic(
    () => import('@/components/auction/AdminTeamManager'),
    {
        loading: () => <Loading size="md" text="Loading manager..." />
    }
);

export const AdminPlayerManager = dynamic(
    () => import('@/components/auction/AdminPlayerManager'),
    {
        loading: () => <Loading size="md" text="Loading manager..." />
    }
);

export const AuctioneerControlPanel = dynamic(
    () => import('@/components/auction/AuctioneerControlPanel'),
    {
        loading: () => <Loading size="md" text="Loading controls..." />
    }
);

export const PlayerPoolView = dynamic(
    () => import('@/components/auction/PlayerPoolView'),
    {
        loading: () => <Loading size="md" text="Loading players..." />
    }
);

export const ProfileClient = dynamic(
    () => import('@/components/profile/ProfileClient'),
    {
        loading: () => <Loading size="lg" text="Loading profile..." />
    }
);
