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
  },
}
