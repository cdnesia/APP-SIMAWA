import { timingSafeEqual } from 'node:crypto';
import type { H3Event } from 'h3';

// Metode yang mengubah state di backend - wajib lolos verifikasi CSRF double-submit sebelum
// diteruskan (GET/HEAD/OPTIONS murni baca, tidak divalidasi - CSRF cuma relevan buat aksi yang
// mengubah data seperti kontrak/batal KRS, simpan EDOM, daftar kegiatan).
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function csrfTokenValid(event: H3Event): boolean {
  const cookieToken = getSimawaCsrfCookie(event);
  const headerToken = getRequestHeader(event, 'x-csrf-token');
  if (!cookieToken || !headerToken) return false;

  const cookieBuf = Buffer.from(cookieToken);
  const headerBuf = Buffer.from(headerToken);
  // Panjang beda -> pasti tidak valid, tapi jangan langsung return sebelum timingSafeEqual
  // dipanggil sama sekali - bandingkan ke buffer sepanjang dirinya sendiri dulu supaya waktu
  // eksekusi tidak membocorkan informasi panjang token yang benar lewat early-return telanjang.
  if (cookieBuf.length !== headerBuf.length) {
    timingSafeEqual(cookieBuf, cookieBuf);
    return false;
  }
  return timingSafeEqual(cookieBuf, headerBuf);
}

// Catch-all proxy resource SERVICE-SIMAWA (mahasiswa, jadwal-kuliah, krs, khs, edom,
// kegiatan-mahasiswa) - forward method/query/body lewat simawaFetch(). Khusus `/krs/print` &
// `/khs/print`: deteksi content-type response backend (`application/pdf`), stream balik raw
// bytes + header yang sama, jangan coba JSON-parse.
export default defineEventHandler(async (event) => {
  const method = event.method;

  if (MUTATING_METHODS.has(method) && !csrfTokenValid(event)) {
    throw createError({ statusCode: 403, statusMessage: 'CSRF token tidak valid atau tidak ada' });
  }

  const path = getRouterParam(event, 'path') ?? '';
  const query = getQuery(event);
  const queryString = new URLSearchParams(query as Record<string, string>).toString();
  const fullPath = `/${path}${queryString ? `?${queryString}` : ''}`;

  const hasBody = method === 'POST' || method === 'PUT' || method === 'PATCH';
  const body = hasBody ? await readBody(event).catch(() => undefined) : undefined;

  const res = await simawaFetch(event, fullPath, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
  });

  const contentType = res.headers.get('content-type') ?? '';
  setResponseStatus(event, res.status);

  if (contentType.includes('application/pdf')) {
    setResponseHeader(event, 'Content-Type', 'application/pdf');
    const contentDisposition = res.headers.get('content-disposition');
    if (contentDisposition) setResponseHeader(event, 'Content-Disposition', contentDisposition);
    const buffer = Buffer.from(await res.arrayBuffer());
    return buffer;
  }

  setResponseHeader(event, 'Content-Type', 'application/json');
  return res.text();
});
