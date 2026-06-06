export default {
  site: {
    // GitHub Pages project site: https://mangust5580.github.io/FortiGuard/
    // siteUrl = origin (no trailing slash), basePath = repo subpath (no trailing slash).
    // Internal/asset links in templates are relative, so they resolve correctly
    // under the subpath; siteUrl/basePath drive sitemap.xml + robots.txt.
    siteUrl: 'https://mangust5580.github.io',
    basePath: '/FortiGuard',
    name: 'FortiGuard',
    shortName: 'FortiGuard',
  },

  images: {
    // AVIF + WebP + fallback are mandatory for all raster content.
    // Must be generated in BOTH dev and prod: a <picture> picks the first
    // <source> its browser supports and does NOT fall back to the <img> when
    // that file 404s — so the avif/webp files have to exist in every served
    // build, dev included. Sources are @2x.png; the build emits 1x outputs plus
    // .webp/.avif (and their @2x variants).
    dev: {
      formats: { webp: true, avif: true },
    },
    prod: {
      formats: { webp: true, avif: true },
    },
    rules: [
      {
        // Hero dashboard is the LCP image on the homepage. Source is 1600×960,
        // but it renders at ~360–680px CSS, so emit smaller widths for
        // phones/tablets and keep the 1x/2x originals for large/hi-dpi screens.
        match: 'hero/hero-dashboard@2x.png',
        responsive: {
          enabled: true,
          widths: [480, 768, 1280],
          keepOriginal: true,
          minSourceWidth: 640,
        },
      },
      {
        // Review avatars render at 96px (192px @2x) but the sources are 1254×1254.
        // Emit only the sizes that are actually displayed.
        match: [
          'people/alexey-orlov@2x.png',
          'people/marina-sokolova@2x.png',
          'people/dmitry-vlasov@2x.png',
        ],
        responsive: {
          enabled: true,
          widths: [96, 192],
          keepOriginal: true,
          minSourceWidth: 192,
        },
      },
      {
        match: 'contacts/contacts-support@2x.png',
        responsive: {
          enabled: true,
          widths: [320, 480],
          keepOriginal: true,
          minSourceWidth: 640,
        },
      },
      {
        match: [
          'articles/article-1@2x.png',
          'articles/article-2@2x.png',
          'articles/article-3@2x.png',
          'articles/article-4@2x.png',
          'articles/article-5@2x.png',
          'articles/article-6@2x.png',
          'articles/article-9@2x.png',
        ],
        responsive: {
          enabled: true,
          widths: [320, 480, 640],
          keepOriginal: true,
          minSourceWidth: 640,
        },
      },
    ],
  },
}
