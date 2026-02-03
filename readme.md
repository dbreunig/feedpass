# FeedPass

FeedPass is a browser extension that discovers RSS feeds as you browse the web. Subscribe to feeds with Feedbin.

1. FeedPass detects `<link rel="alternate">` feed tags on pages you visit.
2. FeedPass lets you know when feeds are found, and adds them to your feed list.
3. Log in with your Feedbin account to subscribe to discovered feeds with one click.

# How to build locally

- Install `yarn`
- `cd` into the extension directory
- Run `yarn`
- Build command
  - Chrome: `yarn build:chrome` -> Out dir: `dist-chrome`
  - Firefox: `yarn build:firefox` -> Out dir: `dist-firefox`
  - Safari: `yarn build:safari` -> Out dir: `dist-safari`
  - All: `yarn build`
