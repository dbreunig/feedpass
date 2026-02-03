import "webextension-polyfill";
import * as React from "react";
import * as ReactDom from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Popover from "@radix-ui/react-popover";
import type { FeedInfo, FeedType, Message } from "./util/constants";
import { getDisplayHref } from "./util/getDisplayHref";
import { getIconState, getFeedStore, getCredentials, getSubscriptions, getShowCommentFeeds } from "./util/storage";
import { cx } from "class-variance-authority";
import { getHrefProps } from "./util/getHrefProps";
import { getDisplayHref as getDisplayFeedUrl } from "./util/getDisplayHref";
import { useFeedStoreQuery, useCredentialsQuery, useShowCommentFeedsQuery } from "./util/reactQuery";
import { authenticate } from "./util/feedbinApi";

getIconState(() => {
  return { state: "off" };
});

// Mark all unseen feeds as seen when popup opens
getFeedStore((prev) => {
  let changed = false;
  const store = new Map(prev);
  for (const [key, feed] of store) {
    if (!feed.seen) {
      store.set(key, { ...feed, seen: true });
      changed = true;
    }
  }
  return changed ? store : undefined;
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: Infinity } },
});

const button = cx(
  "flex h-[1.68em] min-w-[1.4em] shrink-0 cursor-default items-center justify-center rounded-6 bg-faded px-[0.38em] text-11 font-medium focus-visible:outline-none",
);

function Popup() {
  const feedStoreQuery = useFeedStoreQuery();
  const credentialsQuery = useCredentialsQuery();
  const showCommentFeedsQuery = useShowCommentFeedsQuery();
  const popoverCloseRef = React.useRef<HTMLButtonElement>(null);

  const isLoggedIn = !!credentialsQuery.data?.value;

  return (
    <div className="relative flex h-[600px] w-[350px] flex-col overflow-auto bg-primaryBg">
      <div className="flex flex-col items-center pt-[12px]">
        <img src="/icon-128.png" width="36" height="36" />

        <h1 className="text-14 font-medium leading-[1.21] text-primaryText">
          FeedPass
        </h1>
      </div>

      {!isLoggedIn ? (
        <LoginForm />
      ) : (
        <>
          <div className="flex grow flex-col gap-[12px] px-12 py-[18px]">
            {feedStoreQuery.data && (
              <>
                {feedStoreQuery.data.newFeeds.length > 0 && (
                  <FeedSection
                    title="New Feeds"
                    feeds={feedStoreQuery.data.newFeeds}
                    variant="new"
                  />
                )}

                {feedStoreQuery.data.seenFeeds.length > 0 && (
                  <FeedSection
                    title="Previously Seen"
                    feeds={feedStoreQuery.data.seenFeeds}
                    variant="seen"
                  />
                )}

                {feedStoreQuery.data.subscribedFeeds.length > 0 && (
                  <FeedSection
                    title="Subscribed"
                    feeds={feedStoreQuery.data.subscribedFeeds}
                    variant="subscribed"
                  />
                )}
              </>
            )}

            {feedStoreQuery.data &&
              feedStoreQuery.data.newFeeds.length === 0 &&
              feedStoreQuery.data.seenFeeds.length === 0 &&
              feedStoreQuery.data.subscribedFeeds.length === 0 && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <p className="pointer-events-auto text-13 text-secondaryText">
                    No feeds discovered yet. Browse the web!
                  </p>
                </div>
              )}
          </div>

          <div className="absolute right-12 top-12 flex gap-8">
            {feedStoreQuery.data &&
              feedStoreQuery.data.newFeeds.length +
                feedStoreQuery.data.seenFeeds.length +
                feedStoreQuery.data.subscribedFeeds.length >
                0 && (
                <span className={cx(button, "text-accent")}>
                  {feedStoreQuery.data.newFeeds.length +
                    feedStoreQuery.data.seenFeeds.length +
                    feedStoreQuery.data.subscribedFeeds.length}
                </span>
              )}

            <Popover.Root modal>
              <Popover.Close hidden ref={popoverCloseRef} />

              <Popover.Trigger className={cx(button, "text-accent")}>
                <svg
                  fill="currentColor"
                  className="size-[1em]"
                  viewBox="0 0 100 100"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="15" cy="50" r="9" />
                  <circle cx="50" cy="50" r="9" />
                  <circle cx="85" cy="50" r="9" />
                </svg>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  align="end"
                  side="bottom"
                  sideOffset={6}
                  avoidCollisions={false}
                  className="flex rounded-6 border border-primaryBorder bg-primaryBg"
                  onOpenAutoFocus={(ev) => ev.preventDefault()}
                  onCloseAutoFocus={(ev) => ev.preventDefault()}
                >
                  <div className="flex flex-col items-start gap-y-8 p-8">
                    <button
                      className={cx(button, "text-accent")}
                      onClick={async () => {
                        popoverCloseRef.current?.click();
                        const message: Message = {
                          name: "SYNC_SUBSCRIPTIONS",
                          args: {},
                        };
                        await browser.runtime.sendMessage(message);
                        queryClient.refetchQueries();
                      }}
                    >
                      Refresh Subscriptions
                    </button>

                    <label className={cx(button, "text-accent")}>
                      Show Comment Feeds&nbsp;
                      <input
                        type="checkbox"
                        defaultChecked={showCommentFeedsQuery.data}
                        className="scale-[0.82]"
                        onChange={async (ev) => {
                          await getShowCommentFeeds(() => ev.target.checked);
                          queryClient.refetchQueries();
                        }}
                      />
                    </label>

                    <button
                      className={cx(button, "text-accent")}
                      onClick={async () => {
                        popoverCloseRef.current?.click();
                        await getCredentials(() => ({ value: null }));
                        await getSubscriptions(() => []);
                        queryClient.refetchQueries();
                      }}
                    >
                      Sign Out
                    </button>

                    <ConfirmButton
                      className={cx(
                        button,
                        "text-accent data-[confirm]:text-[--red-10]",
                      )}
                      onClick={async () => {
                        popoverCloseRef.current?.click();
                        await getFeedStore(() => new Map());
                        queryClient.refetchQueries();
                      }}
                      confirmJsx=" (Confirm)"
                    >
                      Clear History
                    </ConfirmButton>
                  </div>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>
        </>
      )}
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  return (
    <form
      className="flex grow flex-col gap-[12px] px-12 py-[12px]"
      onSubmit={async (ev) => {
        ev.preventDefault();
        setError("");
        setLoading(true);

        try {
          const creds = { email: email.trim(), password };
          const ok = await authenticate(creds);

          if (!ok) {
            setError("Invalid email or password.");
            setLoading(false);
            return;
          }

          await getCredentials(() => ({ value: creds }));

          const message: Message = {
            name: "SYNC_SUBSCRIPTIONS",
            args: {},
          };
          await browser.runtime.sendMessage(message);

          queryClient.refetchQueries();
        } catch {
          setError("Could not connect to Feedbin.");
        } finally {
          setLoading(false);
        }
      }}
    >
      <p className="text-13 text-secondaryText">Log into Feedbin</p>

      <label className="flex flex-col gap-2">
        <span className="text-12 text-secondaryText">Email</span>
        <input
          type="email"
          required
          autoFocus
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          className="rounded-6 border border-primaryBorder bg-secondaryBg px-6 py-2 text-12 text-primaryText placeholder:text-[--gray-a10]"
          placeholder="you@example.com"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-12 text-secondaryText">Password</span>
        <input
          type="password"
          required
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
          className="rounded-6 border border-primaryBorder bg-secondaryBg px-6 py-2 text-12 text-primaryText placeholder:text-[--gray-a10]"
        />
      </label>

      {error && <p className="text-12 text-[--red-10]">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className={cx(
          button,
          "self-start text-accent",
          loading && "opacity-50",
        )}
      >
        {loading ? "Signing in…" : "Sign In"}
      </button>

      <p className="mt-auto text-11 text-secondaryText">
        Credentials stored locally, sent only to api.feedbin.com
      </p>
    </form>
  );
}

const feedTypePillColors: Record<FeedType, string> = {
  rss: "bg-[--orange-a3] text-[--orange-11]",
  atom: "bg-[--blue-a3] text-[--blue-11]",
  json: "bg-[--green-a3] text-[--green-11]",
};

function FeedTypePill({ type }: { type: FeedType }) {
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center rounded-6 px-[0.38em] text-11 font-medium uppercase",
        feedTypePillColors[type],
      )}
    >
      {type}
    </span>
  );
}

function FeedSection({
  title,
  feeds,
  variant,
}: {
  title: string;
  feeds: FeedInfo[];
  variant: "new" | "seen" | "subscribed";
}) {
  return (
    <div className="flex flex-col gap-[8px]">
      <p
        className={cx(
          "text-13",
          variant === "new" ? "font-medium text-primaryText" : "text-secondaryText",
        )}
      >
        {title}
      </p>

      {feeds.map((feed) => (
        <FeedRow key={feed.feedUrl} feed={feed} variant={variant} />
      ))}
    </div>
  );
}

function CopyFeedUrlButton({ feedUrl }: { feedUrl: string }) {
  const [copied, setCopied] = React.useState(false);

  return (
    <Popover.Root>
      <Popover.Trigger
        className="inline-flex shrink-0 items-center text-secondaryText opacity-60 hover:opacity-100"
        title="Feed URL"
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className="size-[11px]"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6.5 8.5a3 3 0 0 0 4.2.4l2-2a3 3 0 0 0-4.2-4.2l-1.1 1.1" />
          <path d="M9.5 7.5a3 3 0 0 0-4.2-.4l-2 2a3 3 0 0 0 4.2 4.2l1.1-1.1" />
        </svg>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={4}
          className="flex max-w-[320px] items-center gap-6 rounded-6 border border-primaryBorder bg-primaryBg p-6"
          onOpenAutoFocus={(ev) => ev.preventDefault()}
        >
          <span className="min-w-0 break-all text-11 text-secondaryText">
            {getDisplayFeedUrl(feedUrl)}
          </span>
          <button
            className={cx(
              "flex shrink-0 items-center justify-center rounded-6 bg-faded px-[0.38em] py-[0.15em] text-11 font-medium",
              copied ? "text-[--green-11]" : "text-accent",
            )}
            onClick={async () => {
              await navigator.clipboard.writeText(feedUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <a
            {...getHrefProps(feedUrl)}
            className="flex shrink-0 items-center justify-center rounded-6 bg-faded px-[0.38em] py-[0.15em] text-11 font-medium text-accent"
          >
            Open
          </a>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function FeedRow({
  feed,
  variant,
}: {
  feed: FeedInfo;
  variant: "new" | "seen" | "subscribed";
}) {
  const [subscribing, setSubscribing] = React.useState(false);
  const [subscribeResult, setSubscribeResult] = React.useState<
    "created" | "already_subscribed" | "error" | null
  >(null);

  const isSubscribed = variant === "subscribed" || subscribeResult === "created" || subscribeResult === "already_subscribed";

  return (
    <div className="flex items-start gap-6">
      <div className="flex min-w-0 grow flex-col">
        <div className="flex items-center gap-6 leading-[1.45]">
          <FeedTypePill type={feed.feedType} />
          <span
            className={cx(
              "overflow-hidden text-ellipsis whitespace-nowrap text-[13px]",
              variant === "new"
                ? "font-medium text-primaryText"
                : "text-secondaryText",
            )}
            title={feed.feedTitle}
          >
            {feed.feedTitle}
          </span>
        </div>

        <div className="flex items-center gap-6">
          <a
            {...getHrefProps(feed.siteUrl)}
            className="min-w-0 break-all text-[12.5px] leading-[1.5] text-secondaryText"
          >
            {getDisplayHref(feed.siteUrl)}
          </a>
          <CopyFeedUrlButton feedUrl={feed.feedUrl} />
        </div>
      </div>

      {isSubscribed ? (
        <span className="flex size-[1.68em] shrink-0 items-center justify-center text-[--green-11]">
          <svg
            viewBox="0 0 16 16"
            fill="none"
            className="size-[12px]"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 8.5L6 12.5L14 3.5" />
          </svg>
        </span>
      ) : (
        <button
          className={cx(
            button,
            "text-accent",
            subscribing && "opacity-50",
            subscribeResult === "error" && "text-[--red-10]",
          )}
          disabled={subscribing}
          onClick={async () => {
            setSubscribing(true);
            setSubscribeResult(null);

            try {
              const message: Message = {
                name: "SUBSCRIBE_FEED",
                args: { feedUrl: feed.feedUrl },
              };
              const resp = await browser.runtime.sendMessage(message);

              if (resp && typeof resp === "object" && "status" in resp) {
                setSubscribeResult(resp.status);
                if (resp.status === "created" || resp.status === "already_subscribed") {
                  queryClient.refetchQueries();
                }
              } else {
                setSubscribeResult("error");
              }
            } catch {
              setSubscribeResult("error");
            } finally {
              setSubscribing(false);
            }
          }}
        >
          {subscribing ? (
            <span className="animate-pulse">…</span>
          ) : subscribeResult === "error" ? (
            "!"
          ) : (
            "+"
          )}
        </button>
      )}
    </div>
  );
}

function ConfirmButton(
  props: {
    confirmJsx: React.ReactNode;
  } & Pick<
    JSX.IntrinsicElements["button"],
    "onClick" | "className" | "children"
  >,
) {
  const [confirm, setConfirm] = React.useState(false);

  return (
    <button
      data-confirm={confirm ? "" : undefined}
      className={props.className}
      onClick={
        confirm
          ? props.onClick
          : () => {
              setConfirm(true);
            }
      }
    >
      {props.children}
      {confirm && props.confirmJsx}
    </button>
  );
}

const rootNode = document.getElementById("root");
if (!rootNode) {
  throw new Error();
}

const root = ReactDom.createRoot(rootNode);

root.render(
  <QueryClientProvider client={queryClient}>
    <Popup />
  </QueryClientProvider>,
);
