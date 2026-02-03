import { createQuery } from "react-query-kit";
import { getFeedStore, getCredentials, getSubscriptions, getShowCommentFeeds } from "./storage";
import { getFeeds } from "./getFeeds";

export const useFeedStoreQuery = createQuery({
  queryKey: ["feeds"],
  async fetcher() {
    const [feedStore, subscriptions, showCommentFeeds] = await Promise.all([
      getFeedStore(),
      getSubscriptions(),
      getShowCommentFeeds(),
    ]);
    const subscriptionUrls = new Set(subscriptions.map((s) => s.feed_url));
    return getFeeds(feedStore, subscriptionUrls, showCommentFeeds);
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
