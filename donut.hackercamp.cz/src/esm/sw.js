import { precacheAndRoute } from "workbox-precaching";
import { imageCache, pageCache, staticResourceCache } from "workbox-recipes";

addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

precacheAndRoute(self.__WB_MANIFEST);

pageCache();
staticResourceCache();
imageCache();
