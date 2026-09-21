export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const config = useRuntimeConfig();

  const res = await fetch(`${config.simawaApiBase}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...serviceSecretHeader() },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const text = await res.text();
  setResponseStatus(event, res.status);

  if (!res.ok) {
    setResponseHeader(event, 'Content-Type', 'application/json');

    // 429 (rate limit login) - selipkan sisa detik dari header `Retry-After` backend ke body,
    // supaya LoginForm.vue bisa tampilkan countdown hidup, bukan cuma teks statis dari `message`.
    if (res.status === 429) {
      const retryAfterSeconds = Number(res.headers.get('retry-after'));
      const parsed = JSON.parse(text) as Record<string, unknown>;
      return JSON.stringify({ ...parsed, retryAfterSeconds: Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : null });
    }

    return text;
  }

  const parsed = JSON.parse(text) as { data: { user: unknown; accessToken: string } };
  const refreshToken = extractRefreshTokenFromSetCookie(res);

  if (refreshToken) {
    setSimawaSession(event, parsed.data.accessToken, refreshToken);
  }

  return parsed;
});
