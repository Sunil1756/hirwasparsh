import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogType?: "website" | "article";
  ogImage?: string;
  noindex?: boolean;
  structuredData?: Record<string, any>;
}

const DEFAULT_TITLE = "Green Enlightenment – AI & Satellite Tree Intelligence";
const DEFAULT_DESC =
  "Cryptographically audited tree plantation MRV, Sentinel-2 multi-spectral telemetry, and IPCC Tier-2 carbon modeling for citizens, NGOs, and corporate CSR.";
const SITE_URL = "https://green-enlightenment.com";
const DEFAULT_OG_IMAGE = "https://green-enlightenment.com/og-image.jpg";

export function SEO({
  title,
  description = DEFAULT_DESC,
  canonicalPath = "/",
  ogType = "website",
  ogImage = DEFAULT_OG_IMAGE,
  noindex = false,
  structuredData,
}: SEOProps) {
  const fullTitle = title ? `${title} | Green Enlightenment` : DEFAULT_TITLE;
  const canonicalUrl = `${SITE_URL}${canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`}`;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Crawl Control */}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large" />
      )}

      {/* Open Graph / Facebook / WhatsApp */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="Green Enlightenment" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Optional JSON-LD Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}
