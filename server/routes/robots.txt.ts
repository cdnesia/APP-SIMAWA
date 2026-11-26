// robots.txt dinamis - domain sitemap ikut runtimeConfig.public.siteUrl (env NUXT_PUBLIC_SITE_URL),
// jadi tidak perlu diubah manual saat pindah domain/staging.
// Hanya /login yang boleh dirayapi; halaman lain berisi data pribadi di balik login.
export default defineEventHandler((event) => {
  const { siteUrl } = useRuntimeConfig(event).public;
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8');
  return ['User-agent: *', 'Allow: /$', 'Allow: /login', 'Disallow: /', '', `Sitemap: ${siteUrl}/sitemap.xml`, ''].join('\n');
});
