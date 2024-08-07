importScripts("https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.min.js");

addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

workbox.precaching.precacheAndRoute(self.__WB_MANIFEST);

workbox.recipes.pageCache();
workbox.recipes.staticResourceCache();
workbox.recipes.imageCache();
