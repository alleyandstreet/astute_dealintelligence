
import { NextRequest, NextResponse } from "next/server";
import { model } from "@/lib/gemini";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
    const { response } = await requireAuth({
        feature: "content_engine",
        rateLimitKey: "content_engine_requests",
    });
    if (response) return response;

    try {
        const { topic, persona = "Professional" } = await req.json();

        if (!topic) {
            return NextResponse.json({ error: "Topic is required" }, { status: 400 });
        }

        const SYSTEM_PROMPT = `
        You are an expert Social Media Content Strategist and Copywriter.
        
        TONE/PERSONA: "${persona}"
        - Professional: Trustworthy, authoritative, data-backed, polished.
        - Witty: Playful, slightly sarcastic, clever, punchy.
        - Storyteller: Narrative-driven, emotional, builds a world around the input.
        - Bold: Direct, contrarian, high-energy, stops the scroll with intensity.

        INPUT: "${topic}"
        
        TASK: Generate 20 distinct social media post options based on this input:
        - 4 for Instagram
        - 4 for LinkedIn
        - 4 for Twitter (X)
        - 4 for Threads
        - 4 for Facebook
        
        OUTPUT FORMAT: Strict JSON only.
        {
            "instagram": [ { "title": "...", "caption": "...", "hashtags": { "niche": [...], "broad": [...], "highEngagement": [...] } }, ... ],
            "linkedin": [ { "title": "...", "caption": "...", "hashtags": { "niche": [...], "broad": [...], "highEngagement": [...] } }, ... ],
            "twitter": [ { "title": "...", "caption": "...", "hashtags": { "niche": [...], "broad": [...], "highEngagement": [...] } }, ... ],
            "threads": [ { "title": "...", "caption": "...", "hashtags": { "niche": [...], "broad": [...], "highEngagement": [...] } }, ... ],
            "facebook": [ { "title": "...", "caption": "...", "hashtags": { "niche": [...], "broad": [...], "highEngagement": [...] } }, ... ]
        }
        
        PLATFORM ADAPTER RULES:
        
        INSTAGRAM:
        - Must start with a visual "Hook" (1st line).
        - Must end with a clear Call to Action (CTA).
        - Use appropriate line breaks for visual spacing.
        
        LINKEDIN:
        - Use "Professional Spacing": Wide line breaks, bullet points where possible.
        - "Broetry" style: Short, punchy sentences for readability.
        - High-engagement formatting (hooks that preview in feed).
        
        TWITTER/X:
        - If content exceeds 280 chars, format it as a THREAD STARTER (e.g., "[1/...]").
        - Use punchy, fast-paced language.
        
        THREADS:
        - Conversational, chill, texting-a-friend vibe.
        - No engagement bait, just open discussion.
        
        FACEBOOK:
        - Focus on community and shareability.
        - Narrative-led but easy to read.

        HASHTAG CLUSTERS:
        - niche: Specific to the topic (high relevance, lower volume).
        - broad: General industry tags (high volume).
        - highEngagement: Tags that are currently trending/highly active.
        `;

        // Retry Logic
        const MAX_RETRIES = 3;
        let attempt = 0;
        let lastError: any;

        while (attempt < MAX_RETRIES) {
            try {
                if (attempt > 0) {
                    // Exponential backoff: 2s, 4s, 8s
                    const waitTime = Math.pow(2, attempt) * 1000;
                    console.log(`Rate limited. Retrying in ${waitTime}ms... (Attempt ${attempt + 1}/${MAX_RETRIES})`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }

                const result = await model.generateContent(SYSTEM_PROMPT);
                const response = await result.response;
                let text = response.text();

                // Clean markdown and extract JSON
                let textClean = text.replace(/```json/g, "").replace(/```/g, "").trim();
                const start = textClean.indexOf("{");
                const end = textClean.lastIndexOf("}");

                if (start === -1 || end === -1) throw new Error("No JSON found");

                const jsonString = textClean.substring(start, end + 1);
                const jsonContent = JSON.parse(jsonString);

                if (!jsonContent.instagram || !jsonContent.linkedin || !jsonContent.twitter) {
                    // Basic check for at least the main ones. Threads/FB might be missing if model cuts off, but let's be loose.
                    if (jsonContent.variations) {
                        return NextResponse.json({
                            instagram: jsonContent.variations,
                            linkedin: jsonContent.variations,
                            twitter: jsonContent.variations,
                            threads: jsonContent.variations,
                            facebook: jsonContent.variations
                        });
                    }
                    // If we have some but not all, just return what we have (NextJS response will be fine)
                }

                return NextResponse.json(jsonContent);

            } catch (error: any) {
                lastError = error;
                // Only retry on 429 or 503
                if (error.message?.includes("429") || error.message?.includes("503")) {
                    attempt++;
                    continue;
                }
                // Break for other errors (bad prompt, parse error)
                break;
            }
        }

        throw lastError;

    } catch (error: any) {
        console.error("Instagram Gen Error:", error);

        const isRateLimit = error.message?.includes("429");
        const message = isRateLimit
            ? "Server is busy (Rate Limit). Please wait 1 minute and try again."
            : (error.message || "Generation failed");

        return NextResponse.json({ error: message }, { status: 500 });
    }
}
