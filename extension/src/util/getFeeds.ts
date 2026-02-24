import type { DeepReadonly } from "ts-essentials";
import type { FeedInfo, FeedStore } from "./constants";

const COMMENT_PATTERN = /comment/i;

function isCommentFeed(feed: DeepReadonly<FeedInfo>): boolean {
  return COMMENT_PATTERN.test(feed.feedTitle) || COMMENT_PATTERN.test(feed.feedUrl);
}

const GITHUB_HOSTS = /^(.*\.)?(github\.com|github\.io|githubusercontent\.com)$/;

function isGithubFeed(feed: DeepReadonly<FeedInfo>): boolean {
  try {
    const feedHost = new URL(feed.feedUrl).hostname;
    const siteHost = new URL(feed.siteUrl).hostname;
    return GITHUB_HOSTS.test(feedHost) || GITHUB_HOSTS.test(siteHost);
  } catch {
    return false;
  }
}

function normalizeFeedUrl(url: string): string {
  try {
    const u = new URL(url);
    u.protocol = "https:";
    u.hostname = u.hostname.replace(/^www\./, "");
    u.pathname = u.pathname.replace(/\/+$/, "");
    return u.toString().toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

export function getFeeds(
  feedStore: DeepReadonly<FeedStore>,
  subscriptionUrls: Set<string>,
  showCommentFeeds: boolean,
  showGithubFeeds: boolean,
): {
  newFeeds: FeedInfo[];
  seenFeeds: FeedInfo[];
  subscribedFeeds: FeedInfo[];
} {
  const normalizedSubUrls = new Set(
    Array.from(subscriptionUrls).map(normalizeFeedUrl),
  );

  const newFeeds: FeedInfo[] = [];
  const seenFeeds: FeedInfo[] = [];
  const subscribedFeeds: FeedInfo[] = [];

  for (const feed of feedStore.values()) {
    if (feed.feedType === "json") continue;

    if (!showCommentFeeds && isCommentFeed(feed)) continue;

    if (!showGithubFeeds && isGithubFeed(feed)) continue;

    if (normalizedSubUrls.has(normalizeFeedUrl(feed.feedUrl))) {
      subscribedFeeds.push({ ...feed });
    } else if (feed.seen) {
      seenFeeds.push({ ...feed });
    } else {
      newFeeds.push({ ...feed });
    }
  }

  const byDiscoveredAtDesc = (a: FeedInfo, b: FeedInfo) =>
    b.discoveredAt - a.discoveredAt;

  newFeeds.sort(byDiscoveredAtDesc);
  seenFeeds.sort(byDiscoveredAtDesc);
  subscribedFeeds.sort(byDiscoveredAtDesc);

  return { newFeeds, seenFeeds, subscribedFeeds };
}
