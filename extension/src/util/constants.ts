import { z } from "zod";

export type MaybePromise<T> = Promise<T> | T;

export type NotNullNotUndefined = {};

export type Target = "chrome" | "firefox" | "safari";

export type FeedType = "rss" | "atom" | "json";

export type FeedInfo = {
  feedUrl: string;
  feedTitle: string;
  feedType: FeedType;
  siteUrl: string;
  discoveredAt: number;
  seen: boolean;
};

export type FeedStore = Map<string, FeedInfo>;

export type FeedbinCredentials = {
  email: string;
  password: string;
};

export type FeedbinSubscription = {
  id: number;
  feed_id: number;
  title: string;
  feed_url: string;
  site_url: string;
  created_at: string;
};

export const Message = z.discriminatedUnion("name", [
  z.object({
    name: z.literal("FEED_DISCOVERED"),
    args: z.object({
      feedUrl: z.string(),
      feedTitle: z.string(),
      feedType: z.enum(["rss", "atom", "json"]),
      siteUrl: z.string(),
    }),
  }),
  z.object({
    name: z.literal("SUBSCRIBE_FEED"),
    args: z.object({
      feedUrl: z.string(),
    }),
  }),
  z.object({
    name: z.literal("SYNC_SUBSCRIPTIONS"),
    args: z.object({}),
  }),
]);

export const MessageReturn = {
  FEED_DISCOVERED: z.void(),
  SUBSCRIBE_FEED: z.promise(
    z.object({
      status: z.enum(["created", "already_subscribed", "error"]),
      subscription: z
        .object({
          id: z.number(),
          feed_id: z.number(),
          title: z.string(),
          feed_url: z.string(),
          site_url: z.string(),
          created_at: z.string(),
        })
        .optional(),
      error: z.string().optional(),
    }),
  ),
  SYNC_SUBSCRIPTIONS: z.void(),
} satisfies Record<Message["name"], unknown>;

export type Message = z.infer<typeof Message>;

export const actionInactive = {
  "16": "/action-inactive-16.png",
  "19": "/action-inactive-19.png",
  "32": "/action-inactive-32.png",
  "38": "/action-inactive-38.png",
} as const satisfies Record<string, string>;

export const actionActive = {
  "16": "/action-active-16.png",
  "19": "/action-active-19.png",
  "32": "/action-active-32.png",
  "38": "/action-active-38.png",
} as const satisfies Record<string, string>;
