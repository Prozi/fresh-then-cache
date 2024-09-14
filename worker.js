// Establish a cache name
const hostname = self.location.hostname.replace('.', '_');
const cacheName = hostname + '_cache';

// On fetch, function can't be async
// Otherwise the handler would not run
self.addEventListener('fetch', (event) => {
  const { url, method } = event.request;

  // Filter out queries not supported by cache
  if (!url.match(/^https:\/\/?/) || url.match(/\/socket\.io\//)) {
    return;
  }

  // Use same-origin for same origin, attempt no-cors for rest
  const mode = url.startsWith(self.location.origin) ? 'same-origin' : 'no-cors';

  // Respond with fresh or cached response
  event.respondWith(
    new Promise((resolve) => {
      fetch(url, { mode })
        .then((freshResponse) => {
          if (freshResponse.status === 200) {
            // Add the network response to the cache for future visits.
            // Note: we need to make a copy of the response to save it in
            // the cache and use the original as the request response.
            caches.open(cacheName).then((cache) => {
              if (method.toLowerCase() === 'get') {
                cache.put(event.request, freshResponse.clone());
              }

              // Return the fresh network response
              resolve(freshResponse);
            });
          } else {
            caches.open(cacheName).then((cache) =>
              cache.match(event.request).then((cachedResponse) => {
                // Fallback on cache
                // And if not found just return the fresh one even with bad status
                resolve(cachedResponse || freshResponse);
              })
            );
          }
        })
        // eslint-disable-next-line
        .catch((_err) => {
          // Fallback on cache
          return caches.open(cacheName).then((cache) =>
            cache.match(event.request).then((cachedResponse) => {
              resolve(cachedResponse);
            })
          );
        });
    })
  );
});
