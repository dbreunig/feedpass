import type { DeepReadonly } from "ts-essentials";
import {
  FeedStore,
  FeedbinCredentials,
  FeedbinSubscription,
  MaybePromise,
  NotNullNotUndefined,
  actionActive,
  actionInactive,
} from "./constants";

function storageFactory<T extends NotNullNotUndefined>(args: {
  parse(storageData: any): DeepReadonly<T>;
  serialize(data: DeepReadonly<T>): any;
  storageKey: string;
  onChange?(args: {
    prev: DeepReadonly<T>;
    curr: DeepReadonly<T>;
  }): MaybePromise<void>;
}): {
  (
    cb?: (data: DeepReadonly<T>) => MaybePromise<DeepReadonly<T> | void>,
  ): Promise<DeepReadonly<T>>;
} {
  let lastDataPromise: Promise<DeepReadonly<T>> = Promise.resolve(
    args.parse(undefined),
  );

  return (cb) => {
    const oldLastDataPromise = lastDataPromise;
    lastDataPromise = new Promise((res) => {
      oldLastDataPromise.then(async (oldValue) => {
        try {
          const storageData = (
            await browser.storage.local.get(args.storageKey)
          )?.[args.storageKey];

          const data = args.parse(storageData);
          const changedData = await cb?.(data);

          if (changedData !== undefined) {
            await Promise.all([
              browser.storage.local.set({
                [args.storageKey]: args.serialize(changedData),
              }),
              args.onChange?.({
                prev: data,
                curr: changedData,
              }),
            ]);
          }

          res(changedData ?? data);
        } catch (err) {
          res(oldValue);
        }
      });
    });

    return lastDataPromise;
  };
}

export const getIconState = storageFactory({
  storageKey: "feedpass-icon-state-1",
  parse(storageData) {
    const iconState: { state: "on" | "off"; unreadCount?: number | undefined } =
      storageData ?? { state: "off" };
    return iconState;
  },
  serialize(iconState) {
    return iconState;
  },
  onChange({ prev, curr }) {
    const browserAction =
      __TARGET__ === "firefox" ? browser.browserAction : browser.action;

    if (__TARGET__ !== "safari") {
      const path = curr.state === "off" ? actionInactive : actionActive;
      browserAction.setIcon({ path });
    }

    browserAction.setBadgeBackgroundColor({ color: "#9f99f5" });

    const badgeText = curr.unreadCount ? `+${curr.unreadCount}` : "";
    browserAction.setBadgeText({ text: badgeText });
  },
});

export const getFeedStore = storageFactory({
  storageKey: "feedpass-feed-store-1",
  parse(storageData) {
    let feedStore: FeedStore;
    try {
      feedStore = new Map(storageData);
    } catch {
      feedStore = new Map();
    }
    return feedStore;
  },
  serialize(feedStore) {
    return Array.from(feedStore.entries());
  },
  async onChange({ prev, curr }) {
    let prevUnseen = 0;
    for (const feed of prev.values()) {
      if (!feed.seen) prevUnseen++;
    }

    let currUnseen = 0;
    for (const feed of curr.values()) {
      if (!feed.seen) currUnseen++;
    }

    const newUnseenCount = currUnseen - prevUnseen;
    if (newUnseenCount <= 0) {
      return;
    }

    getIconState((iconState) => ({
      state: "on",
      unreadCount: (iconState.unreadCount ?? 0) + newUnseenCount,
    }));
  },
});

export const getCredentials = storageFactory({
  storageKey: "feedpass-credentials-1",
  parse(storageData): { value: FeedbinCredentials | null } {
    if (
      storageData &&
      typeof storageData === "object" &&
      typeof storageData.email === "string" &&
      typeof storageData.password === "string"
    ) {
      return { value: storageData as FeedbinCredentials };
    }
    return { value: null };
  },
  serialize(data) {
    return data.value;
  },
});

export const getShowCommentFeeds = storageFactory({
  storageKey: "feedpass-show-comment-feeds-1",
  parse(storageData: boolean) {
    return storageData ?? false;
  },
  serialize(data) {
    return data;
  },
});

export const getSubscriptions = storageFactory({
  storageKey: "feedpass-subscriptions-1",
  parse(storageData): FeedbinSubscription[] {
    if (Array.isArray(storageData)) {
      return storageData;
    }
    return [];
  },
  serialize(data) {
    return data;
  },
});
