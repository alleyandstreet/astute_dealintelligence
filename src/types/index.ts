export interface Deal {
    id: string;
    createdAt: Date | string;
    updatedAt: Date | string;
    name: string;
    description?: string | null;
    industry?: string | null;
    location?: string | null;
    url?: string | null;
    askingPrice?: number | null;
    revenue?: number | null;
    revenueType?: string | null;
    ebitda?: number | null;
    sde?: number | null;
    valuationMin?: number | null;
    valuationMax?: number | null;
    source: string;
    sourceId?: string | null;
    sourceName?: string | null;
    redditUrl?: string | null;
    redditAuthor?: string | null;
    redditScore?: number | null;
    redditComments?: number | null;
    status: string;
    aiSummary?: string | null;
    viabilityScore?: number | null;
    motivationScore?: number | null;
    dealQuality?: number | null;
    riskFlags?: string | null;
    sellerSignals?: string | null;
    businessType?: string | null;
    contactReddit?: string | null;
    contactEmail?: string | null;
    contactWebsite?: string | null;
}

export interface User {
    id: string;
    username: string;
    email?: string | null;
    role: string;
    isActive: boolean;
    lastLogin?: Date | string | null;
    createdAt: Date | string;
}

export interface Business {
    id: string;
    name: string;
    description?: string | null;
    industry?: string | null;
    valuation?: number | null;
    revenue?: number | null;
    status: string;
    ownerId: string;
    owner?: {
        username: string;
        email?: string | null;
    };
}
