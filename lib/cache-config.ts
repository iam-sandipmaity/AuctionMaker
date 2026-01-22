// Cache configuration for different data types
export const cacheConfig = {
    // Static data that rarely changes
    static: {
        revalidate: 3600, // 1 hour
        tags: ['static']
    },
    
    // Auction listings - moderate freshness
    auctions: {
        revalidate: 60, // 1 minute
        tags: ['auctions']
    },
    
    // Individual auction details - fresh for active auctions
    auctionDetail: {
        revalidate: 10, // 10 seconds
        tags: ['auction-detail']
    },
    
    // User profile - moderate freshness
    profile: {
        revalidate: 300, // 5 minutes
        tags: ['profile']
    },
    
    // Live data - always fresh
    live: {
        revalidate: 0, // No cache
        tags: ['live']
    }
};

// Helper to create cache tags
export function createCacheTags(type: string, id?: string): string[] {
    const tags = [type];
    if (id) {
        tags.push(`${type}-${id}`);
    }
    return tags;
}
