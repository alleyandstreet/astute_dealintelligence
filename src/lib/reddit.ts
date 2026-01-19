/**
 * Reddit Scraping Engine
 * Uses Reddit's public JSON API (no authentication required)
 * Simply append .json to any Reddit URL to get JSON data
 */

export interface RedditPost {
    id: string;
    title: string;
    content: string;
    author: string;
    subreddit: string;
    url: string;
    score: number;
    numComments: number;
    createdAt: Date;
    permalink: string;
}

interface RedditApiPost {
    data: {
        id: string;
        title: string;
        selftext: string;
        author: string;
        subreddit: string;
        url: string;
        score: number;
        num_comments: number;
        created_utc: number;
        permalink: string;
        is_self: boolean;
    };
}

interface RedditApiResponse {
    data: {
        children: RedditApiPost[];
        after: string | null;
    };
}

// Rate limiting
const RATE_LIMIT_MS = 2000; // 2 seconds between requests
let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < RATE_LIMIT_MS) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS - timeSinceLastRequest));
    }

    lastRequestTime = Date.now();

    const response = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json",
            "Accept-Language": "en-US,en;q=0.9",
        }
    });

    if (!response.ok) {
        if (response.status === 429) {
            console.warn("Rate limited, waiting 60s...");
            await new Promise(resolve => setTimeout(resolve, 60000));
            return rateLimitedFetch(url);
        }
        throw new Error(`Reddit API error: ${response.status}`);
    }

    return response;
}

/**
 * Fetch posts from a subreddit
 */
export async function fetchSubredditPosts(
    subreddit: string,
    limit: number = 100,
    sort: "hot" | "new" | "top" = "new",
    timeframe: "hour" | "day" | "week" | "month" | "year" | "all" = "week"
): Promise<RedditPost[]> {
    const posts: RedditPost[] = [];
    let after: string | null = null;
    const postsPerRequest = Math.min(limit, 100);

    try {
        while (posts.length < limit) {
            let url = `https://www.reddit.com/r/${subreddit}/${sort}.json?limit=${postsPerRequest}`;
            if (sort === "top") url += `&t=${timeframe}`;
            if (after) url += `&after=${after}`;

            const response = await rateLimitedFetch(url);
            const data: RedditApiResponse = await response.json();

            if (!data.data?.children?.length) break;

            for (const post of data.data.children) {
                if (!post.data.is_self) continue; // Only self posts (text posts)

                posts.push({
                    id: post.data.id,
                    title: post.data.title,
                    content: post.data.selftext,
                    author: post.data.author,
                    subreddit: post.data.subreddit,
                    url: `https://reddit.com${post.data.permalink}`,
                    score: post.data.score,
                    numComments: post.data.num_comments,
                    createdAt: new Date(post.data.created_utc * 1000),
                    permalink: post.data.permalink,
                });
            }

            after = data.data.after;
            if (!after) break;
        }
    } catch (error) {
        console.error(`Error fetching r/${subreddit}:`, error);
    }

    return posts.slice(0, limit);
}

/**
 * Search Reddit for posts matching keywords
 */
export async function searchReddit(
    query: string,
    subreddit?: string,
    limit: number = 100
): Promise<RedditPost[]> {
    const posts: RedditPost[] = [];

    try {
        let url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=${Math.min(limit, 100)}&sort=relevance&t=month`;
        if (subreddit) {
            url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&limit=${Math.min(limit, 100)}&sort=relevance&t=month&restrict_sr=1`;
        }

        const response = await rateLimitedFetch(url);
        const data: RedditApiResponse = await response.json();

        for (const post of data.data.children) {
            if (!post.data.is_self) continue;

            posts.push({
                id: post.data.id,
                title: post.data.title,
                content: post.data.selftext,
                author: post.data.author,
                subreddit: post.data.subreddit,
                url: `https://reddit.com${post.data.permalink}`,
                score: post.data.score,
                numComments: post.data.num_comments,
                createdAt: new Date(post.data.created_utc * 1000),
                permalink: post.data.permalink,
            });
        }
    } catch (error) {
        console.error("Error searching Reddit:", error);
    }

    return posts;
}

/**
 * Scrape multiple subreddits
 */
export async function scrapeSubreddits(
    subreddits: string[],
    postsPerSubreddit: number = 50,
    onProgress?: (message: string) => void
): Promise<RedditPost[]> {
    const allPosts: RedditPost[] = [];

    for (const subreddit of subreddits) {
        onProgress?.(`Fetching r/${subreddit}...`);

        try {
            const posts = await fetchSubredditPosts(subreddit, postsPerSubreddit);
            allPosts.push(...posts);
            onProgress?.(`✓ Got ${posts.length} posts from r/${subreddit}`);
        } catch (error) {
            onProgress?.(`✗ Failed to fetch r/${subreddit}: ${error}`);
        }
    }

    return allPosts;
}

// Default subreddit packs
export const SUBREDDIT_PACKS = {
    saas: ["SaaS", "microsaas", "EntrepreneurRideAlong", "indiehackers"],
    ecommerce: ["ecommerce", "FulfillmentByAmazon", "shopify", "dropship"],
    service: ["smallbusiness", "sweatystartup", "Entrepreneur", "sidehustle"],
};

export const DEFAULT_KEYWORDS = [
    "selling", "exit", "MRR", "ARR", "revenue", "burned out",
    "moving on", "acquisition", "for sale", "looking for buyer"
];
