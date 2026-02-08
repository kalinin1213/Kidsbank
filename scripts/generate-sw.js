const { generateSW } = require('workbox-build');

async function build() {
  const { count, size } = await generateSW({
    globDirectory: 'out/',
    globPatterns: ['**/*.{js,css,html,png,json,ico,svg,woff,woff2}'],
    globIgnores: ['sw.js', 'workbox-*.js'],
    swDest: 'out/sw.js',
    modifyURLPrefix: {
      '': '/Kidsbank/',
    },
    navigateFallback: '/Kidsbank/index.html',
    navigateFallbackDenylist: [/^\/api\//],
    skipWaiting: false,
    clientsClaim: true,
    inlineWorkboxRuntime: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/(firestore|identitytoolkit|securetoken)\.googleapis\.com/,
        handler: 'NetworkOnly',
      },
    ],
  });

  console.log(
    `Generated service worker: ${count} files precached, totaling ${(size / 1024 / 1024).toFixed(2)} MB`
  );
}

build().catch((err) => {
  console.error('Failed to generate service worker:', err);
  process.exit(1);
});
