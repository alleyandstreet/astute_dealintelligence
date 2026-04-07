import { normalizeDateToYmd } from "@/lib/date-utils";
import type { ProductHuntGroundedListing } from "@/lib/gemini";

const PH_BASE_URL = "https://www.producthunt.com";
const MIN_EXPECTED_LISTINGS = 20;

function toAbsoluteUrl(url: string | undefined | null): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("/")) return `${PH_BASE_URL}${trimmed}`;
  return trimmed;
}

function normalizeUpvotes(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.]/g, "");
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) return Math.max(0, Math.round(parsed));
  }
  return 0;
}

function extractNextData(html: string): any | null {
  const match = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

async function fetchNextDataJson(buildId: string, datePath: string): Promise<any | null> {
  const candidates = [
    `${PH_BASE_URL}/_next/data/${buildId}/leaderboard/daily/${datePath}/all.json`,
    `${PH_BASE_URL}/_next/data/${buildId}/en/leaderboard/daily/${datePath}/all.json`,
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          "Accept": "application/json",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        },
        cache: "no-store",
      });

      if (!res.ok) continue;
      const json = await res.json();
      if (json && typeof json === "object") return json;
    } catch {
      // try next candidate
    }
  }

  return null;
}

function isLikelyPost(candidate: any): boolean {
  if (!candidate || typeof candidate !== "object") return false;
  const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
  const tagline =
    typeof candidate.tagline === "string"
      ? candidate.tagline.trim()
      : typeof candidate.description === "string"
        ? candidate.description.trim()
        : "";
  if (!name || !tagline) return false;

  const url = typeof candidate.url === "string" ? candidate.url : "";
  const slug = typeof candidate.slug === "string" ? candidate.slug : "";
  if (!url && !slug) return false;

  const votes = candidate.votesCount ?? candidate.votes ?? candidate.upvotes ?? candidate.score;
  if (votes === undefined || votes === null) return false;

  const productUrl = toAbsoluteUrl(url || (slug ? `/posts/${slug}` : ""));
  if (!productUrl || !productUrl.includes("/posts/")) return false;

  return true;
}

function extractDateForCandidate(candidate: any): string | null {
  const dateFields = ["featuredAt", "createdAt", "postedAt", "launchDate", "publishedAt"];
  for (const field of dateFields) {
    const raw = candidate[field];
    if (typeof raw === "string") {
      const normalized = normalizeDateToYmd(raw);
      if (normalized) return normalized;
    }
  }
  return null;
}

function toListing(candidate: any): ProductHuntGroundedListing {
  const name = String(candidate.name || "").trim();
  const tagline =
    typeof candidate.tagline === "string"
      ? candidate.tagline.trim()
      : typeof candidate.description === "string"
        ? candidate.description.trim()
        : "";
  const votes = normalizeUpvotes(candidate.votesCount ?? candidate.votes ?? candidate.upvotes ?? candidate.score);
  const productHuntUrl = toAbsoluteUrl(candidate.url || (candidate.slug ? `/posts/${candidate.slug}` : ""));
  const productWebsiteUrl = toAbsoluteUrl(
    candidate.website ||
    candidate.websiteUrl ||
    candidate.redirectUrl ||
    candidate.redirect_url ||
    candidate.link ||
    ""
  );

  const makersRaw = Array.isArray(candidate.makers)
    ? candidate.makers
    : Array.isArray(candidate.users)
      ? candidate.users
      : candidate.user
        ? [candidate.user]
        : [];

  const makerNames = makersRaw
    .map((maker: any) => (typeof maker?.name === "string" ? maker.name.trim() : ""))
    .filter(Boolean);

  const contactLinks: { twitter?: string; linkedin?: string; website?: string; email?: string } = {};
  for (const maker of makersRaw) {
    if (!contactLinks.twitter && typeof maker?.twitterUsername === "string" && maker.twitterUsername.trim()) {
      contactLinks.twitter = `https://twitter.com/${maker.twitterUsername.replace(/^@/, "")}`;
    }
    if (!contactLinks.linkedin && typeof maker?.linkedinUrl === "string" && maker.linkedinUrl.trim()) {
      contactLinks.linkedin = maker.linkedinUrl.trim();
    }
    if (!contactLinks.website && typeof maker?.websiteUrl === "string" && maker.websiteUrl.trim()) {
      contactLinks.website = maker.websiteUrl.trim();
    }
    if (!contactLinks.email && typeof maker?.email === "string" && maker.email.trim()) {
      contactLinks.email = maker.email.trim();
    }
  }

  const topicsRaw =
    candidate.topics?.nodes ||
    candidate.topics ||
    candidate.tags ||
    candidate.categories ||
    [];
  const categories = Array.isArray(topicsRaw)
    ? topicsRaw
        .map((topic: any) =>
          typeof topic === "string"
            ? topic.trim()
            : typeof topic?.name === "string"
              ? topic.name.trim()
              : ""
        )
        .filter(Boolean)
    : [];

  return {
    name,
    tagline,
    upvotes: votes,
    productHuntUrl,
    productWebsiteUrl,
    makerNames,
    contactLinks,
    categories,
  };
}

function collectListings(root: any, targetDate: string): ProductHuntGroundedListing[] {
  const listings: ProductHuntGroundedListing[] = [];
  const seen = new Set<string>();

  const visit = (value: any) => {
    if (!value) return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (typeof value !== "object") return;

    if (isLikelyPost(value)) {
      const candidateDate = extractDateForCandidate(value);
      if (candidateDate && candidateDate !== targetDate) return;

      const listing = toListing(value);
      const key = listing.productHuntUrl || `${listing.name}::${listing.tagline}`;
      if (key && !seen.has(key)) {
        seen.add(key);
        listings.push(listing);
      }
    }

    for (const child of Object.values(value)) {
      visit(child);
    }
  };

  visit(root);
  return listings;
}

export async function fetchProductHuntLeaderboardAll(date: string): Promise<ProductHuntGroundedListing[]> {
  const [yearRaw, monthRaw, dayRaw] = date.split("-");
  if (!yearRaw || !monthRaw || !dayRaw) return [];

  const datePath = `${yearRaw}/${monthRaw}/${dayRaw}`;
  const url = `${PH_BASE_URL}/leaderboard/daily/${datePath}/all`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
      },
      cache: "no-store",
    });

    if (!res.ok) return [];
    const html = await res.text();
    const nextData = extractNextData(html);
    if (!nextData) return [];

    let listings = collectListings(nextData, date);
    if (listings.length >= MIN_EXPECTED_LISTINGS) return listings;

    const buildId = typeof nextData.buildId === "string" ? nextData.buildId : "";
    if (!buildId) return listings;

    const nextJson = await fetchNextDataJson(buildId, datePath);
    if (!nextJson) return listings;

    const expanded = collectListings(nextJson, date);
    if (expanded.length > listings.length) {
      listings = expanded;
    }

    return listings;
  } catch {
    return [];
  }
}
