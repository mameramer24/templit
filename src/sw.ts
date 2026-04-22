/// <reference lib="webworker" />

/**
 * Service Worker entry point — @serwist/next
 *
 * This file is compiled by Serwist during the Next.js build.
 * It runs in the service worker scope (NOT the main thread).
 *
 * Strategy: NetworkFirst for all API calls, CacheFirst for static assets.
 */

import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "serwist";

// __SW_MANIFEST is injected by @serwist/next at build time
declare const self: ServiceWorkerGlobalScope & {
  // Injected by @serwist/next at build time — typed as the precache manifest array
  __SW_MANIFEST: (string | { url: string; revision: string | null })[] | undefined;
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST ?? [],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
