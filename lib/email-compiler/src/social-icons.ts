export type SocialPlatform =
    | "facebook"
    | "instagram"
    | "twitter"
    | "linkedin"
    | "youtube"
    | "tiktok"
    | "pinterest"
    | "custom";

export interface SocialPlatformStyle {
    bg: string;
    glyph: string;
    label: string;
}

export const SOCIAL_PLATFORM_STYLES: Record<SocialPlatform, SocialPlatformStyle> = {
    facebook: { bg: "#1877F2", glyph: "f", label: "Facebook" },
    instagram: { bg: "#E4405F", glyph: "◎", label: "Instagram" },
    twitter: { bg: "#000000", glyph: "𝕏", label: "X / Twitter" },
    linkedin: { bg: "#0A66C2", glyph: "in", label: "LinkedIn" },
    youtube: { bg: "#FF0000", glyph: "▶", label: "YouTube" },
    tiktok: { bg: "#000000", glyph: "♪", label: "TikTok" },
    pinterest: { bg: "#E60023", glyph: "P", label: "Pinterest" },
    custom: { bg: "#6b7280", glyph: "•", label: "Link" },
};

export const SOCIAL_PLATFORM_OPTIONS = Object.entries(SOCIAL_PLATFORM_STYLES).map(([value, style]) => ({
    value,
    label: style.label,
}));

export function detectSocialPlatform(label?: string, url?: string): SocialPlatform {
    const hay = `${label ?? ""} ${url ?? ""}`.toLowerCase();
    if (hay.includes("facebook") || hay.includes("fb.com") || hay.includes("fb.me")) return "facebook";
    if (hay.includes("instagram") || hay.includes("instagr.am")) return "instagram";
    if (hay.includes("twitter") || hay.includes("x.com")) return "twitter";
    if (hay.includes("linkedin")) return "linkedin";
    if (hay.includes("youtube") || hay.includes("youtu.be")) return "youtube";
    if (hay.includes("tiktok")) return "tiktok";
    if (hay.includes("pinterest")) return "pinterest";
    return "custom";
}

export function resolveSocialPlatform(
    platform?: string,
    label?: string,
    url?: string,
): SocialPlatform {
    if (platform && platform in SOCIAL_PLATFORM_STYLES) {
        return platform as SocialPlatform;
    }
    return detectSocialPlatform(label, url);
}
