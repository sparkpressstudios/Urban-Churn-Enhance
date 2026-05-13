import { Helmet } from "react-helmet-async";

const SITE_URL = "https://urbanchurn.com";
const SITE_NAME = "Urban Churn";
const DEFAULT_OG_IMAGE = `${SITE_URL}/opengraph.jpg`;

interface BreadcrumbItem {
    name: string;
    url: string;
}

interface SEOProps {
    title: string;
    description?: string;
    keywords?: string;
    canonical?: string;
    ogImage?: string;
    ogType?: string;
    noIndex?: boolean;
    jsonLd?: Record<string, unknown> | Record<string, unknown>[];
    breadcrumbs?: BreadcrumbItem[];
}

export default function SEO({
    title,
    description,
    keywords,
    canonical,
    ogImage = DEFAULT_OG_IMAGE,
    ogType = "website",
    noIndex = false,
    jsonLd,
    breadcrumbs,
}: SEOProps) {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
    const canonicalUrl = canonical ? `${SITE_URL}${canonical}` : undefined;

    const breadcrumbJsonLd = breadcrumbs?.length ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: `${SITE_URL}${item.url}`,
        })),
    } : null;

    const allJsonLd = [
        ...(jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : []),
        ...(breadcrumbJsonLd ? [breadcrumbJsonLd] : []),
    ];

    return (
        <Helmet>
            <title>{fullTitle}</title>
            {description && <meta name="description" content={description} />}
            {keywords && <meta name="keywords" content={keywords} />}
            {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
            <meta name="robots" content={noIndex ? "noindex, nofollow" : "index, follow"} />

            {/* Open Graph */}
            <meta property="og:locale" content="en_US" />
            <meta property="og:title" content={fullTitle} />
            {description && <meta property="og:description" content={description} />}
            <meta property="og:type" content={ogType} />
            <meta property="og:site_name" content={SITE_NAME} />
            {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
            <meta property="og:image" content={ogImage} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:image:alt" content={fullTitle} />

            {/* Twitter Card */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:site" content="@urbanchurn" />
            <meta name="twitter:title" content={fullTitle} />
            {description && <meta name="twitter:description" content={description} />}
            <meta name="twitter:image" content={ogImage} />
            <meta name="twitter:image:alt" content={fullTitle} />

            {/* JSON-LD Structured Data */}
            {allJsonLd.map((ld, i) => (
                <script key={i} type="application/ld+json">
                    {JSON.stringify(ld)}
                </script>
            ))}
        </Helmet>
    );
}
