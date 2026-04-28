import { Helmet } from "react-helmet-async";

const DEFAULT_SITE_URL = "https://filmgraph.app";
const DEFAULT_IMAGE = `${DEFAULT_SITE_URL}/pwa-512.svg`;

function normalizeUrl(pathname = "/") {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : DEFAULT_SITE_URL;

  if (pathname.startsWith("http://") || pathname.startsWith("https://")) {
    return pathname;
  }

  return `${origin}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

function SeoHead({
  title,
  description,
  pathname = "/",
  image,
  type = "website",
  jsonLd,
}) {
  const canonicalUrl = normalizeUrl(pathname);
  const ogImage = image || DEFAULT_IMAGE;
  const fullTitle = title?.includes("Filmgraph")
    ? title
    : `${title} | Filmgraph`;

  return (
    <Helmet prioritizeSeoTags>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Filmgraph" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {jsonLd ? (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      ) : null}
    </Helmet>
  );
}

export default SeoHead;
