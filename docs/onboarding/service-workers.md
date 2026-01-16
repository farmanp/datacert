# Service Workers Crash Course for DataCert Developers

Welcome! This guide explains the role of Service Workers in DataCert. They are a key part of what makes our application a Progressive Web App (PWA), enabling offline capabilities and performance optimizations.

## What is a Service Worker?

A Service Worker is a script that your browser runs in the background, separate from a web page. It acts like a proxy, intercepting network requests and managing a cache of responses.

Key characteristics:

*   It's a **JavaScript Worker**, so it can't access the DOM directly.
*   It runs on a **separate thread**, so it doesn't block your UI.
*   It can be **terminated when not in use** and restarted when needed, saving resources.
*   It's the foundation for features like **offline support, background sync, and push notifications.**

## Why Does DataCert Use a Service Worker?

DataCert is a **local-first** application. We want it to be fast, reliable, and available even if the user has a spotty internet connection. Our goal is to make it feel like a native desktop app.

Here's how Service Workers help us achieve that:

1.  **Offline Access:** The very first time a user visits DataCert, the Service Worker installs and caches all the necessary application assets (HTML, CSS, JS, and even the Wasm module). On subsequent visits, it can serve these assets directly from the cache, making the app load instantly, even without an internet connection.
2.  **Performance:** By serving assets from the local cache, we dramatically reduce network latency. This makes the app feel incredibly snappy.
3.  **PWA Installation:** A Service Worker is a prerequisite for a web application to be "installable" on a user's desktop or mobile device.

## The Service Worker Lifecycle

Understanding the lifecycle is key to avoiding confusion. A Service Worker has three main stages:

1.  **Registration:** Your main application code (in `src/app/index.tsx`) checks if the browser supports Service Workers and then registers our Service Worker script.

    ```typescript
    // In src/app/index.tsx (simplified)
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').then(registration => {
                console.log('SW registered: ', registration);
            }).catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
        });
    }
    ```

2.  **Installation:** Once registered, the browser runs the Service Worker script. The `install` event is fired. This is our chance to cache the application "shell"—all the static assets needed to run the app.

    ```javascript
    // In our Service Worker script (e.g., using Workbox)
    self.addEventListener('install', event => {
        console.log('Service Worker installing.');
        // Caching logic goes here
    });
    ```

3.  **Activation:** After installation, the Service Worker is `activated`. The `activate` event is where you can manage old caches, cleaning up assets from previous versions of the Service Worker.

## How We Manage Caching: "Cache-First" Strategy

For our application assets, we use a **"cache-first"** strategy. When a request is made for a file (like a CSS file or our Wasm bundle):

1.  The Service Worker intercepts the request.
2.  It checks if the file is in its cache.
3.  **If yes:** It serves the file directly from the cache. This is super fast.
4.  **If no:** It fetches the file from the network, serves it to the app, AND saves a copy in the cache for next time.

This is why the app loads so quickly on repeat visits.

## Important: Service Workers and Web Workers are Different!

It's easy to confuse them. Here's a simple breakdown:

| Feature              | Service Worker                               | Web Worker                                 |
| -------------------- | -------------------------------------------- | ------------------------------------------ |
| **Purpose**          | Network proxy, cache management, PWA features | Offload heavy computation from the main thread |
| **DOM Access**       | No                                           | No                                         |
| **Runs in...**       | Background, even if tab is closed            | Background, but tied to a specific tab     |
| **DataCert Usage** | Caching app shell for offline access.        | Running the Rust/Wasm data profiling engine. |

In DataCert:
*   The **Service Worker** makes the app load fast and work offline.
*   The **Web Worker** keeps the UI responsive while our Rust engine crunches numbers.

## Your "Hello Service Worker" Task

You don't need to write a Service Worker from scratch, but you should know how to see it in action.

1.  Run `npm run dev`.
2.  Open your browser's Developer Tools.
3.  Go to the **Application** tab.
4.  On the left-hand side, click on **Service Workers**. You should see a registered Service Worker for the current page. You can see its status (activated and running).
5.  Click on **Cache Storage**. You'll see the caches created by the Service Worker, full of the app's assets.
6.  Now, in the DevTools **Network** tab, check the "Disable cache" box and reload the page. You'll see all assets being fetched from the network.
7.  Uncheck "Disable cache" and reload again. You'll now see many requests in the "Size" column marked as `(ServiceWorker)`. This means they were served directly from the cache, not the network.

By observing this behavior, you can confirm that the Service Worker is doing its job: intercepting requests and serving assets from the cache to make the application faster and more resilient.

## Deeper Dive: Caching Strategies and Updates

The "cache-first" strategy is great for the application shell, but for dynamic content, we need more sophisticated approaches. This is where different caching strategies and handling updates become critical.

*In DataCert, we use a library called **Workbox** to simplify service worker management. Workbox, developed by Google, provides production-ready tools for caching and routing. The examples below use Workbox syntax.*

### Beyond Cache-First: Other Caching Strategies

1.  **Stale-While-Revalidate:** This strategy is a fantastic balance of speed and freshness.
    *   It first serves the content from the cache (if available) for an instant response.
    *   Simultaneously, it sends a request to the network to get the latest version.
    *   The next time the user requests that asset, they get the fresh version.
    *   **Use Case:** Perfect for content that updates frequently but isn't critical to be real-time, like user avatars, blog posts, or non-critical API data.

2.  **Network-First:** This strategy prioritizes freshness.
    *   It first tries to fetch the content from the network.
    *   If the network request succeeds, it serves the fresh content and updates the cache.
    *   If the network request fails (e.g., the user is offline), it falls back to serving the content from the cache.
    *   **Use Case:** Essential for requests where having the most up-to-date information is critical, like the current stock price, a user's account balance, or an API call that must be current.

3.  **Network-Only:** As the name implies, this strategy never uses the cache. It always goes to the network.
    *   **Use Case:** For requests that cannot be served from a cache under any circumstances, like one-time password (OTP) requests or financial transactions.

### The Service Worker Update Lifecycle

This is one of the trickiest parts of service workers. When you deploy a new version of the app, you also deploy a new service worker file (`sw.js`). Here's what happens:

1.  The browser detects the `sw.js` file is different (even a single byte change matters).
2.  It downloads the new service worker and runs its `install` event in the background. The new worker is now in a **"waiting"** state.
3.  The old service worker continues to control the page. The new one won't take over until all tabs controlled by the old worker are closed. This is a safety measure to prevent breaking a page that's in the middle of something.
4.  Once all tabs are closed and the page is re-opened, the new service worker `activates` and takes control.

This "close all tabs" requirement is not user-friendly. We need a way to prompt the user to update.

**Prompting the User to Update:**
We can listen for the "waiting" state and show the user a "New version available! Refresh?" button.

```typescript
// In our main application code (e.g., App.tsx)
import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    // Show a toast, a modal, etc.
    if (confirm('A new version of DataCert is available. Refresh to update?')) {
      updateSW(); // This will tell the new service worker to take over
    }
  },
  onOfflineReady() {
    // App is ready to work offline
  },
});
```
*Our project uses `vite-plugin-pwa`, which provides the `virtual:pwa-register` module to make this easy.*

### Advanced Exercise: Implement a New Caching Strategy

Let's say we have a (hypothetical) API endpoint `/api/user-settings` that we want to cache, but we always want to show the latest version if possible, while still providing an offline fallback. This is a perfect use case for the **Network-First** strategy.

**Goal:** Add a new route to our Workbox service worker configuration to handle `/api/user-settings`.

1.  **Locate the Service Worker Configuration:**
    Our service worker is configured in `vite.config.ts` within the `VitePWA` plugin options. Find the `workbox` object inside the `pwa` configuration.

2.  **Add a New Runtime Caching Route:**
    Inside the `workbox.runtimeCaching` array, you'll see existing rules. Add a new one for our API endpoint.
    ```typescript
    // In vite.config.ts, inside the VitePWA plugin config

    //...
    workbox: {
        runtimeCaching: [
            // ... other rules may be here
            {
                // Match any request that starts with /api/
                urlPattern: /^https?:\/\/.*/api\/.*/,
                // Apply a NetworkFirst strategy.
                handler: 'NetworkFirst',
                options: {
                    // Name of the cache for this strategy.
                    cacheName: 'api-cache',
                    // Fallback to cache if network fails, for up to 1 day.
                    expiration: {
                        maxEntries: 10,
                        maxAgeSeconds: 60 * 60 * 24 * 1 // 1 day
                    },
                    cacheableResponse: {
                        statuses: [0, 200] // Cache successful responses and opaque responses
                    }
                }
            }
        ]
    }
    //...
    ```

3.  **Build and Verify:**
    *   Run `npm run build` to build the production version of the app, which will generate the new service worker.
    *   Run `npm run preview` to serve the production build.
    *   Open DevTools -> Application -> Service Workers. Ensure the new worker is activated.
    *   In your app, make a (fake) call to `/api/user-settings`.
    *   Go to DevTools -> Application -> Cache Storage. You should now see a new cache named `api-cache` containing the response from your API call.
    *   Now, in DevTools -> Application -> Service Workers, check the "Offline" box.
    *   Reload your app. The call to `/api/user-settings` should still "succeed" by being served from the cache.

This exercise gives you hands-on experience with configuring caching strategies, which is a core task in maintaining a high-performance PWA.

