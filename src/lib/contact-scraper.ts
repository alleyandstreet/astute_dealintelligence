
import { db } from "@/lib/db";

/**
 * Extracts emails from text using a robust regex.
 */
function extractEmails(text: string): string[] {
    // Basic email regex - can be improved but covers most cases
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const matches = text.match(emailRegex);
    return matches ? Array.from(new Set(matches)) : [];
}

/**
 * Extracts social media links from text.
 */
function extractSocials(text: string) {
    const socials: { [key: string]: string } = {};

    // Twitter/X
    const twitterMatch = text.match(/https?:\/\/(www\.)?(twitter\.com|x\.com)\/[a-zA-Z0-9_]+/i);
    if (twitterMatch) socials.twitter = twitterMatch[0];

    // LinkedIn
    const linkedinMatch = text.match(/https?:\/\/(www\.)?linkedin\.com\/(in|company)\/[a-zA-Z0-9_-]+/i);
    if (linkedinMatch) socials.linkedin = linkedinMatch[0];

    // GitHub
    const githubMatch = text.match(/https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_-]+/i);
    if (githubMatch) socials.github = githubMatch[0];

    // Instagram
    const instaMatch = text.match(/https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.]+/i);
    if (instaMatch) socials.instagram = instaMatch[0];

    return socials;
}

/**
 * Enriches a deal by scraping the provided URL for contact info.
 * This is designed to be a "fire and forget" background task.
 * 
 * FINE-TUNED V2:
 * - Deep Scans: /contact, /about, /team
 * - Smart Filter: Ignores noreply, sentry, etc.
 * - Better Regex: Avoids image.png/file.js
 */
export async function enrichDeal(dealId: string, url: string) {
    if (!url || !url.startsWith("http")) return;

    console.log(`🕵️‍♀️ Enriching deal ${dealId} from ${url} (Deep Scan)...`);

    // JUNK FILTERS
    const JUNK_EMAILS = [
        "noreply", "no-reply", "donotreply", "support", "help", "info", "contact",
        "sales", "admin", "webmaster", "security", "privacy", "legal",
        "careers", "jobs", "team", "media", "press", "sentry", "notifications",
        "billing", "invoice", "accounts"
    ];

    const JUNK_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg", "css", "js", "min", "map", "woff", "woff2", "ttf"];

    function isJunkEmail(email: string): boolean {
        const lower = email.toLowerCase();
        const [user, domain] = lower.split("@");

        // Filter junk usernames
        if (JUNK_EMAILS.some(garbage => user === garbage || user.includes(garbage))) return true;

        // Filter junk extensions (e.g. image.png regex false positive)
        const ext = domain.split(".").pop();
        if (ext && JUNK_EXTENSIONS.includes(ext)) return true;

        return false;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout for deep scan

        // Helper to fetch and extract
        const visited = new Set<string>();
        const emailsFound = new Set<string>();
        const socialsFound: { [key: string]: string } = {};

        async function scanPage(targetUrl: string) {
            if (visited.has(targetUrl)) return;
            visited.add(targetUrl);

            try {
                const res = await fetch(targetUrl, {
                    signal: controller.signal,
                    headers: { "User-Agent": "Astute/1.0.0 (Biz Dev Bot)" }
                });

                if (!res.ok) return;
                const html = await res.text();

                // Extract Emails
                const emails = extractEmails(html);
                emails.forEach(e => {
                    if (!isJunkEmail(e)) emailsFound.add(e);
                });

                // Extract Socials
                const socials = extractSocials(html);
                Object.assign(socialsFound, socials);

                return html; // Return content to find more links
            } catch (e) {
                return "";
            }
        }

        // 1. Scan Homepage
        const homeHtml = await scanPage(url);

        // 2. Identify "Deep" Pages (Contact/About/Team)
        // Simple heuristic: check if we should even try deep scan (if no high quality emails found)
        let shouldDeepScan = emailsFound.size === 0;

        if (shouldDeepScan && homeHtml) {
            // Find links like <a href="/contact"> or <a href="about.html">
            const relevantPaths = ["contact", "about", "team"];
            const foundLinks: string[] = [];

            // Simple regex to find hrefs
            const linkRegex = /href=["']((?:\/|[a-zA-Z0-9])[^"']+)["']/g;
            let match;
            while ((match = linkRegex.exec(homeHtml)) !== null) {
                const href = match[1];
                if (relevantPaths.some(p => href.toLowerCase().includes(p))) {
                    // Normalize URL
                    try {
                        const absoluteUrl = new URL(href, url).toString();
                        if (absoluteUrl.startsWith(url)) { // Only scan same domain
                            foundLinks.push(absoluteUrl);
                        }
                    } catch { }
                }
            }

            // Limit to top 3 unique relevant links
            const uniqueLinks = Array.from(new Set(foundLinks)).slice(0, 3);

            if (uniqueLinks.length > 0) {
                console.log(`🔎 Deep scanning: ${uniqueLinks.join(", ")}`);
                await Promise.all(uniqueLinks.map(link => scanPage(link)));
            }
        }

        clearTimeout(timeoutId);

        // Save Results
        const emails = Array.from(emailsFound);
        const updateData: any = {};

        let enrichmentText = "🕵️‍♀️ **Enrichment Results (v2):**\n";
        let foundAny = false;

        if (emails.length > 0) {
            enrichmentText += `- **Emails**: ${emails.join(", ")}\n`;
            updateData.contactEmail = emails[0];
            foundAny = true;
        }

        if (Object.keys(socialsFound).length > 0) {
            enrichmentText += `- **Socials**: ${Object.entries(socialsFound).map(([k, v]) => `[${k}](${v})`).join(", ")}\n`;
            if (socialsFound.twitter) updateData.contactTwitter = socialsFound.twitter;
            if (socialsFound.linkedin) updateData.contactLinkedin = socialsFound.linkedin;
            foundAny = true;
        }

        if (foundAny) {
            await db.deal.update({
                where: { id: dealId },
                data: updateData
            }).catch(() => console.log("Note-only update"));

            await db.note.create({
                data: {
                    content: enrichmentText,
                    dealId: dealId,
                    authorName: "Astute Enrichment Bot",
                }
            });
            console.log(`✅ Enriched deal ${dealId}.`);
        } else {
            console.log(`🤷 No contacts found for ${dealId} even after deep scan.`);
        }

    } catch (error) {
        console.error(`⚠️ Error enriching deal ${dealId}:`, error);
    }
}
