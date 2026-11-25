// Login mahasiswa LANGSUNG ke REST-API-SIMAWA (POST /v1/mahasiswa/login) dengan NPM + password - tanpa
// client_id/secret. Token akses + refresh dari backend disimpan di cookie httpOnly Nitro (setSimawaSession), TIDAK
// dikirim ke browser. Body dari LoginForm tetap { email, password } (field `email` berisi NPM, format lama).
export default defineEventHandler(async (event) => {
  const body = (await readBody(event).catch(() => null)) as { email?: unknown; password?: unknown } | null;

  const res = await fetch(`${simawaApiBase()}/mahasiswa/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...forwardedForHeader(event) },
    body: JSON.stringify({ npm: body?.email, password: body?.password }),
    cache: 'no-store',
  });

  // Gagal (401 NPM/password salah, 403 bukan mahasiswa, 422 kosong, 429 + retryAfterSeconds untuk countdown
  // LoginForm.vue) - diteruskan dalam format lama { success:false, message }.
  if (!res.ok) {
    return teruskanRespons(event, res);
  }

  const json = (await res.json()) as {
    message?: string;
    data: { user: unknown; access_token: string; refresh_token: string };
  };
  setSimawaSession(event, json.data.access_token, json.data.refresh_token);

  return { success: true, message: json.message ?? 'Login berhasil', data: { user: keKamel(json.data.user) } };
});
