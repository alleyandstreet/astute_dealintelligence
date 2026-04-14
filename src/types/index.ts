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
    contactTwitter?: string | null;
    contactLinkedIn?: string | null;
    contactDiscord?: string | null;
    ownerId?: string | null;
    priority?: string;
    nextAction?: string | null;
    nextActionAt?: Date | string | null;
    lastContactedAt?: Date | string | null;
    owner?: {
        id: string;
        username: string;
        email?: string | null;
    } | null;
    lastMovedById?: string | null;
    lastMovedBy?: {
        id: string;
        username: string;
        email?: string | null;
    } | null;
    notes?: Note[];
    crmTasks?: CrmTask[];
}

export interface Note {
    id: string;
    content: string;
    createdAt: Date | string;
    authorName?: string | null;
    userId?: string | null;
    user?: {
        id: string;
        username: string;
    } | null;
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

export interface CrmTask {
    id: string;
    title: string;
    description?: string | null;
    status: string;
    priority: string;
    dueDate?: Date | string | null;
    completedAt?: Date | string | null;
    notes?: string | null;
    dealId?: string | null;
    assignedToId?: string | null;
    createdById?: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
    deal?: {
        id: string;
        name: string;
        status: string;
        priority?: string | null;
    } | null;
    assignedTo?: {
        id: string;
        username: string;
        email?: string | null;
    } | null;
    createdBy?: {
        id: string;
        username: string;
        email?: string | null;
    } | null;
}
