import { createQuery } from "react-query-kit";
import { getFeedStore, getCredentials, getSubscriptions, getShowCommentFeeds, getShowGithubFeeds } from "./storage";
import { getFeeds } from "./getFeeds";

export const useFeedStoreQuery = createQuery({
  queryKey: ["feeds"],
  async fetcher() {
    const [feedStore, subscriptions, showCommentFeeds, showGithubFeeds] = await Promise.all([
      getFeedStore(),
      getSubscriptions(),
      getShowCommentFeeds(),
      getShowGithubFeeds(),
    ]);
    const subscriptionUrls = new Set(subscriptions.map((s) => s.feed_url));
    return getFeeds(feedStore, subscriptionUrls, showCommentFeeds, showGithubFeeds);
  },
});

export const useCredentialsQuery = createQuery({
  queryKey: ["credentials"],
  fetcher: () => getCredentials(),
});

export const useSubscriptionsQuery = createQuery({
  queryKey: ["subscriptions"],
  fetcher: () => getSubscriptions(),
});

export const useShowCommentFeedsQuery = createQuery({
  queryKey: ["showcommentfeeds"],
  fetcher: () => getShowCommentFeeds(),
});

export const useShowGithubFeedsQuery = createQuery({
  queryKey: ["showgithubfeeds"],
  fetcher: () => getShowGithubFeeds(),
});
