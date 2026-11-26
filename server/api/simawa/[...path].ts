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

// Path lama SERVICE-SIMAWA (dipakai app/features/*/services/api.ts) -> path REST-API-SIMAWA /v1/saya/* (mahasiswa
// diambil backend dari token login, TIDAK ada NPM di URL). Daftar putih: path lain -> 404. `$1` = segmen dinamis
// (jadwalId / token EDOM / id kegiatan).
const PETA_PATH: [RegExp, string][] = [
  [/^mahasiswa\/me$/, 'profil'],
  [/^mahasiswa\/riwayat-beasiswa$/, 'riwayat-beasiswa'],
  [/^jadwal-kuliah$/, 'jadwal-kuliah'],
  [/^krs$/, 'krs'],
  [/^krs\/riwayat$/, 'krs/riwayat'],
  [/^krs\/jadwal-tersedia$/, 'krs/jadwal-tersedia'],
  [/^krs\/print$/, 'krs/cetak'],
  [/^krs\/([^/]+)$/, 'krs/$1'], // DELETE batal kontrak (setelah riwayat/jadwal-tersedia/print)
  [/^khs$/, 'khs'],
  [/^khs\/riwayat$/, 'khs/riwayat'],
  [/^khs\/ipk-trend$/, 'khs/ipk-trend'],
  [/^khs\/print$/, 'khs/cetak'],
  [/^edom\/([^/]+)$/, 'edom/$1'],
  [/^transkrip$/, 'transkrip'],
  [/^transkrip\/print$/, 'transkrip/cetak'],
  [/^kegiatan-mahasiswa$/, 'kegiatan'],
  [/^kegiatan-mahasiswa\/riwayat$/, 'kegiatan/riwayat'],
  [/^kegiatan-mahasiswa\/([^/]+)\/daftar$/, 'kegiatan/$1/daftar'],
  [/^tagihan\/cek$/, 'tagihan'],
  [/^tagihan\/rincian-aktif$/, 'tagihan/rincian-aktif'],
  [/^pertemuan-verifikasi$/, 'pertemuan-verifikasi'], // GET daftar, POST verifikasi { pertemuanIds }
];

function petakanPath(path: string): string | null {
  for (const [pola, tujuan] of PETA_PATH) {
    const cocok = path.match(pola);
    if (!cocok) continue;
    const segmen = cocok[1];
    if (segmen === undefined) return tujuan;
    if (segmen === '.' || segmen === '..') return null;
    return tujuan.replace('$1', encodeURIComponent(decodeURIComponent(segmen)));
  }
  return null;
}

// Query lama camelCase (kodeTahunAkademik, kontrakKrs, buatSpp) -> snake_case REST-API-SIMAWA.
function queryString(event: H3Event): string {
  const params = new URLSearchParams();
  for (const [kunci, nilai] of Object.entries(getQuery(event))) {
    for (const v of Array.isArray(nilai) ? nilai : [nilai]) {
      if (v !== undefined && v !== null) params.append(kamelKeSnake(kunci), String(v));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

// Catch-all proxy data mahasiswa (profil, jadwal kuliah, KRS, KHS, EDOM, transkrip, kegiatan, tagihan) - forward
// method/query/body lewat simawaFetch() ke /v1/saya/*, konversi kunci camelCase <-> snake_case, dan PDF cetak
// KRS/KHS/transkrip diteruskan sebagai byte mentah (lihat teruskanRespons).
export default defineEventHandler(async (event) => {
  const method = event.method;

  if (MUTATING_METHODS.has(method) && !csrfTokenValid(event)) {
    throw createError({ statusCode: 403, statusMessage: 'CSRF token tidak valid atau tidak ada' });
  }

  const path = getRouterParam(event, 'path') ?? '';
  const tujuan = petakanPath(path);
  if (tujuan === null) {
    setResponseStatus(event, 404);
    return { success: false, message: `Route ${method} /${path} tidak ditemukan` };
  }

  const hasBody = method === 'POST' || method === 'PUT' || method === 'PATCH';
  const body = hasBody ? await readBody(event).catch(() => undefined) : undefined;

  const res = await simawaFetch(event, `/saya/${tujuan}${queryString(event)}`, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(keSnake(body)), headers: { 'Content-Type': 'application/json' } } : {}),
  });

  return teruskanRespons(event, res);
});
