import { Helmet } from "react-helmet-async";

const SITE_URL = "https://urbanchurn.com";
const SITE_NAME = "Urban Churn";
const DEFAULT_OG_IMAGE = `${SITE_URL}/opengraph.jpg`;
const TWITTER_HANDLE = "@urbanchurn";

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
    const robotsContent = noIndex
        ? "noindex, nofollow"
        : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";

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
            <html lang="en" />
            <title>{fullTitle}</title>
            {description && <meta name="description" content={description} />}
            {keywords && <meta name="keywords" content={keywords} />}
            {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
            <meta name="robots" content={robotsContent} />
            <meta name="author" content="Urban Churn Craft Creamery" />
            <meta name="application-name" content={SITE_NAME} />

            {/* Open Graph */}
            <meta property="og:locale" content="en_US" />
            <meta property="og:title" content={fullTitle} />
            {description && <meta property="og:description" content={description} />}
            <meta property="og:type" content={ogType} />
            <meta property="og:site_name" content={SITE_NAME} />
            {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
            <meta property="og:image" content={ogImage} />
            <meta property="og:image:secure_url" content={ogImage} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:image:alt" content={fullTitle} />

            {/* Twitter Card */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:site" content={TWITTER_HANDLE} />
            <meta name="twitter:creator" content={TWITTER_HANDLE} />
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

/** Reusable WebSite schema with search action for the homepage */
export const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Urban Churn",
    url: SITE_URL,
    description: "Craft ice cream creamery in Central PA — unique flavors, natural ingredients, nothing fake.",
    publisher: {
        "@type": "Organization",
        name: "Urban Churn Craft Creamery",
        logo: {
            "@type": "ImageObject",
            url: `${SITE_URL}/images/uc-logo-black.png`,
        },
    },
    potentialAction: {
        "@type": "SearchAction",
        target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE_URL}/pre-order?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
    },
};

/** LocalBusiness schema for ice cream shop locations */
export function iceCreamShopJsonLd(location: {
    name: string;
    street: string;
    city: string;
    zip: string;
    phone?: string;
    url?: string;
}) {
    return {
        "@context": "https://schema.org",
        "@type": "IceCreamShop",
        name: `Urban Churn — ${location.name}`,
        image: `${SITE_URL}/opengraph.jpg`,
        url: location.url ?? SITE_URL,
        telephone: location.phone ?? "+1-717-884-9396",
        address: {
            "@type": "PostalAddress",
            streetAddress: location.street,
            addressLocality: location.city,
            addressRegion: "PA",
            postalCode: location.zip,
            addressCountry: "US",
        },
        servesCuisine: "Ice Cream",
        priceRange: "$$",
        parentOrganization: {
            "@type": "Organization",
            name: "Urban Churn Craft Creamery",
            url: SITE_URL,
        },
    };
}
