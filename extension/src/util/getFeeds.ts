import type { DeepReadonly } from "ts-essentials";
import type { FeedInfo, FeedStore } from "./constants";

const COMMENT_PATTERN = /comment/i;

function isCommentFeed(feed: DeepReadonly<FeedInfo>): boolean {
  return COMMENT_PATTERN.test(feed.feedTitle) || COMMENT_PATTERN.test(feed.feedUrl);
}

export function getFeeds(
  feedStore: DeepReadonly<FeedStore>,
  subscriptionUrls: Set<string>,
  showCommentFeeds: boolean,
): {
  newFeeds: FeedInfo[];
  seenFeeds: FeedInfo[];
  subscribedFeeds: FeedInfo[];
} {
  const newFeeds: FeedInfo[] = [];
  const seenFeeds: FeedInfo[] = [];
  const subscribedFeeds: FeedInfo[] = [];

  for (const feed of feedStore.values()) {
    if (!showCommentFeeds && isCommentFeed(feed)) {
      continue;
    }

    if (subscriptionUrls.has(feed.feedUrl)) {
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
