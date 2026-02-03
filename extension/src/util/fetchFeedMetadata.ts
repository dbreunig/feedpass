export async function fetchFeedMetadata(
  feedUrl: string,
): Promise<{ title?: string; siteUrl?: string }> {
  try {
    const resp = await fetch(feedUrl);
    if (!resp.ok) return {};

    const text = await resp.text();

    // Try JSON Feed
    try {
      const json = JSON.parse(text);
      if (json.version && typeof json.version === "string" && json.version.includes("jsonfeed")) {
        const result: { title?: string; siteUrl?: string } = {};
        if (typeof json.title === "string") result.title = json.title;
        if (typeof json.home_page_url === "string") result.siteUrl = json.home_page_url;
        return result;
      }
      // Some JSON feeds don't declare version but have title
      if (typeof json.title === "string" && (json.items || json.home_page_url)) {
        const result: { title?: string; siteUrl?: string } = {};
        result.title = json.title;
        if (typeof json.home_page_url === "string") result.siteUrl = json.home_page_url;
        return result;
      }
    } catch {
      // Not JSON, continue to XML parsing
    }

    // XML feed parsing (no DOMParser in service workers)
    // Extract first <title> — in both RSS and Atom, the feed-level title comes first
    const titleMatch = text.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
    const title = titleMatch?.[1]?.trim();

    // RSS: <channel><link>http://example.com</link>
    // Match <link> with text content (not self-closing Atom-style <link ... />)
    const rssLinkMatch = text.match(/<link>([^<]+)<\/link>/);
    const rssLink = rssLinkMatch?.[1]?.trim();

    // Atom: <link href="..." rel="alternate" /> or <link rel="alternate" href="..." />
    const atomAltMatch = text.match(
      /<link[^>]*\brel=["']alternate["'][^>]*\bhref=["']([^"']+)["'][^>]*\/?>/,
    ) || text.match(
      /<link[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']alternate["'][^>]*\/?>/,
    );

    // Atom fallback: first <link href="..."> without rel="self"
    const atomFallbackMatch = !atomAltMatch
      ? text.match(/<link[^>]*\bhref=["']([^"']+)["'][^>]*(?!rel=["']self)[\s/>]/)
      : null;

    const siteUrl = rssLink || atomAltMatch?.[1] || atomFallbackMatch?.[1];

    const result: { title?: string; siteUrl?: string } = {};
    if (title) result.title = title;
    if (siteUrl) result.siteUrl = siteUrl;
    return result;
  } catch {
    return {};
  }
}
