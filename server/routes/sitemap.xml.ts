// sitemap.xml - cukup satu URL publik (halaman masuk). Halaman lain sengaja tidak dicantumkan
// karena wajib login & berstatus noindex.
export default defineEventHandler((event) => {
  const { siteUrl } = useRuntimeConfig(event).public;
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/login</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
});
