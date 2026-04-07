export const HUB_FEATURE_DEFINITIONS = [
    { key: "deal_sourcing", label: "Deal Sourcing" },
    { key: "market_intelligence", label: "Market Intelligence" },
    { key: "content_engine", label: "Content Engine" },
    { key: "team_crm", label: "Team CRM" },
    { key: "admin_control", label: "Admin Control" },
] as const;

export type HubFeatureKey = (typeof HUB_FEATURE_DEFINITIONS)[number]["key"];

export const HUB_FEATURE_KEYS = HUB_FEATURE_DEFINITIONS.map((feature) => feature.key);

export function getFeatureFromPath(pathname: string): HubFeatureKey | null {
    if (!pathname) return null;

    if (pathname.startsWith("/admin")) return "admin_control";
    if (pathname.startsWith("/market-intelligence")) return "market_intelligence";
    if (pathname.startsWith("/marketing") || pathname.startsWith("/calendar")) return "content_engine";
    if (pathname.startsWith("/crm") || pathname.startsWith("/team-chat")) return "team_crm";

    if (
        pathname.startsWith("/dashboard")
        || pathname.startsWith("/sources")
        || pathname.startsWith("/deals")
        || pathname.startsWith("/pipeline")
        || pathname.startsWith("/analytics")
        || pathname.startsWith("/support")
    ) {
        return "deal_sourcing";
    }

    return null;
}

