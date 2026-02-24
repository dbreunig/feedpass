/* eslint-env browser */

import type { FeedType, Message } from "./util/constants.js";

function getCurrentUrlSanitized() {
  const url = new URL(window.location.toString());

  url.hash = "";

  url.searchParams.delete("utm_source");
  url.searchParams.delete("utm_medium");
  url.searchParams.delete("utm_campaign");
  url.searchParams.delete("utm_term");
  url.searchParams.delete("utm_content");

  url.searchParams.delete("guccounter");
  url.searchParams.delete("guce_referrer");
  url.searchParams.delete("guce_referrer_sig");

  return url.toString();
}

const FEED_SELECTOR = [
  'link[rel="alternate"][type="application/rss+xml"]',
  'link[rel="alternate"][type="application/atom+xml"]',
].join(",");

const TYPE_MAP: Record<string, FeedType> = {
  "application/rss+xml": "rss",
  "application/atom+xml": "atom",
};

let currentUrlSanitized = getCurrentUrlSanitized();
const discoveredFeedUrls: Set<string> = new Set();

function discoverFeeds() {
  const elements = document.querySelectorAll(FEED_SELECTOR);

  for (const element of elements) {
    const href = element.getAttribute("href");
    if (!href) continue;

    let feedUrl: string;
    try {
      feedUrl = new URL(href, window.location.href).toString();
    } catch {
      continue;
    }

    if (discoveredFeedUrls.has(feedUrl)) continue;
    discoveredFeedUrls.add(feedUrl);

    const typeAttr = element.getAttribute("type") ?? "";
    const feedType = TYPE_MAP[typeAttr];
    if (!feedType) continue;

    const feedTitle =
      element.getAttribute("title") ||
      document.title ||
      new URL(window.location.href).hostname;

    const message: Message = {
      name: "FEED_DISCOVERED",
      args: {
        feedUrl,
        feedTitle,
        feedType,
        siteUrl: currentUrlSanitized,
      },
    };
    browser.runtime.sendMessage(message);
  }
}

new MutationObserver(() => {
  const testCurrentUrlSanitized = getCurrentUrlSanitized();
  if (currentUrlSanitized !== testCurrentUrlSanitized) {
    currentUrlSanitized = testCurrentUrlSanitized;
    discoveredFeedUrls.clear();
  }

  discoverFeeds();
}).observe(document.documentElement, {
  subtree: true,
  childList: true,
  attributeFilter: ["rel", "type"],
});

discoverFeeds();
