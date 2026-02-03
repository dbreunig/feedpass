import { z } from "zod";
import { Message, MessageReturn } from "./constants";
import * as feedbinApi from "./feedbinApi";
import { getFeedStore, getCredentials, getSubscriptions } from "./storage";

type ArgMap = {
  [Key in Message["name"]]: Extract<Message, { name: Key }>["args"];
};

export const messageCallbacks: {
  [K in keyof ArgMap]: (value: ArgMap[K]) => z.infer<(typeof MessageReturn)[K]>;
} = {
  async FEED_DISCOVERED(args) {
    const feedStore = await getFeedStore();

    if (feedStore.has(args.feedUrl)) {
      return;
    }

    const subscriptions = await getSubscriptions();
    const isSubscribed = subscriptions.some(
      (sub) => sub.feed_url === args.feedUrl,
    );

    await getFeedStore((prev) => {
      const newStore = new Map(prev);
      newStore.set(args.feedUrl, {
        feedUrl: args.feedUrl,
        feedTitle: args.feedTitle,
        feedType: args.feedType,
        siteUrl: args.siteUrl,
        discoveredAt: Date.now(),
        seen: isSubscribed,
      });
      return newStore;
    });
  },

  async SUBSCRIBE_FEED(args) {
    const creds = (await getCredentials()).value;
    if (!creds) {
      return { status: "error" as const, error: "Not logged in" };
    }

    const result = await feedbinApi.subscribe(creds, args.feedUrl);

    if (result.status === "created" || result.status === "already_subscribed") {
      // Refresh subscriptions cache
      try {
        const subs = await feedbinApi.getSubscriptions(creds);
        await getSubscriptions(() => subs);
      } catch {
        // Non-critical: cache refresh failed
      }

      // Mark feed as seen
      await getFeedStore((prev) => {
        const store = new Map(prev);
        const feed = store.get(args.feedUrl);
        if (feed) {
          store.set(args.feedUrl, { ...feed, seen: true });
        }
        return store;
      });
    }

    return result;
  },

  async SYNC_SUBSCRIPTIONS() {
    const creds = (await getCredentials()).value;
    if (!creds) {
      return;
    }

    try {
      const subs = await feedbinApi.getSubscriptions(creds);
      await getSubscriptions(() => subs);

      const subUrls = new Set(subs.map((s) => s.feed_url));

      await getFeedStore((prev) => {
        let changed = false;
        const store = new Map(prev);

        for (const [key, feed] of store) {
          if (!feed.seen && subUrls.has(feed.feedUrl)) {
            store.set(key, { ...feed, seen: true });
            changed = true;
          }
        }

        return changed ? store : undefined;
      });
    } catch {
      // Sync failed silently
    }
  },
};

export function runMessageCallback<K extends keyof ArgMap>(
  message: { [P in K]: { name: P; args: ArgMap[P] } }[K],
): z.infer<(typeof MessageReturn)[K]> {
  return messageCallbacks[message.name](message.args);
}
