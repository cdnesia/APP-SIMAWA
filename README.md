# APP-SIMAWA

Portal mahasiswa SIMAWA (Nuxt 4, TypeScript, Tailwind v4). Semua request ke backend dilakukan
lewat server route Nitro sendiri (pola BFF) — browser tidak pernah bicara langsung ke
SERVICE-SIMAWA maupun menyimpan token apapun, lihat `server/utils/simawaApi.ts`.

## Menjalankan

```bash
npm install
npm run dev
```

Butuh SERVICE-SIMAWA (port 4000) jalan — satu-satunya backend yang dipanggil APP-SIMAWA (lihat
`.env.example`). SERVICE-PUBLIC (port 4010, fitur tagihan & referensi dosen/ruang) dipanggil
SERVICE-SIMAWA sendiri, bukan langsung dari sini — APP-SIMAWA tidak punya kredensial M2M ke
service manapun. Env divalidasi otomatis saat startup lewat `server/plugins/validate-env.ts`
(Zod) — server langsung gagal dengan pesan jelas kalau ada variabel yang kosong/salah format.

## Struktur (feature-based, Nuxt 4)

Struktur dikelompokkan per domain fitur, bukan per layer teknis — tiap fitur bawa `services/api.ts`
(client-side fetcher, `$fetch` ke server route lokal), `types.ts`, dan `components/` sendiri.
Halaman di `app/pages/` sengaja dibuat setipis mungkin (cuma render 1 komponen dari
`app/features/.../components/`), supaya routing tetap murni lapisan navigasi, bukan tempat logic.

- `app/pages/` — routing file-based Nuxt. `login/index.vue` pakai `definePageMeta({ layout: false })`
  (tanpa sidebar), sisanya otomatis pakai `layouts/default.vue` (bungkus `AppLayout` — sidebar &
  navbar).
- `app/features/` — satu folder per domain: `auth`, `mahasiswa`, `dashboard`, `jadwal-kuliah`,
  `krs`, `khs`, `edom`, `kegiatan-mahasiswa`, `tagihan`. Tiap fitur: `services/api.ts` (fetcher
  `$fetch`), `types.ts`, `components/`.
- `app/composables/` — `useAuth.ts` (state login, `useState()` bawaan Nuxt, SSR-safe, tanpa Pinia),
  `useToast.ts` (state toast, pola sama).
- `app/middleware/auth.global.ts` — proteksi route: redirect ke `/login` kalau cookie sesi tidak
  ada, redirect ke `/` kalau sudah login tapi akses `/login`. Cek keberadaan cookie
  `simawa_session` (flag non-httpOnly, isi cuma `'1'`) — BUKAN `simawa_refresh`/`simawa_access`
  yang httpOnly (sengaja tersembunyi dari `document.cookie`, jadi tidak bisa dibaca `useCookie()`
  saat navigasi client-side SPA).
- `app/components/ui/`, `app/components/layout/AppLayout.vue` — komponen UI lintas fitur (nama
  flat 1 kata seperti `Button`/`Card`/`Badge` — lihat override `vue/multi-word-component-names`
  di `eslint.config.mjs`).
- `app/utils/` — helper murni lintas fitur (format tanggal/rupiah, parsing tahun akademik, buka
  preview PDF, parsing error `$fetch`). Util yang cuma dipakai 1 fitur hidup di dalam folder fitur
  itu sendiri (mis. `features/khs/lib/nilai.ts`). **`apiFetch.ts`** — wrapper wajib pengganti
  `$fetch` polos di SEMUA `features/*/services/api.ts`: `$fetch` biasa TIDAK membawa cookie
  browser saat dipanggil dari sisi server (dalam `useAsyncData` saat SSR), jadi tanpa wrapper ini
  setiap fetch data saat render awal balas 401. Selalu pakai `apiFetch`, jangan `$fetch` langsung,
  di file `services/api.ts` manapun.
- `server/api/` — server route Nitro (proxy ke SERVICE-SIMAWA, pegang cookie httpOnly lewat h3
  `getCookie`/`setCookie`). `server/api/simawa/[...path].ts` adalah catch-all proxy generik untuk
  SEMUA resource (mahasiswa, jadwal-kuliah, krs, khs, edom, kegiatan-mahasiswa, tagihan, termasuk
  passthrough PDF cetak KRS/KHS); `server/api/auth/*` route khusus (perlu extract/set cookie
  sesi, tidak bisa lewat catch-all generik).
- `server/utils/` — logic server-only: `simawaApi.ts` (`simawaFetch()` + refresh token dedup),
  `simawaSession.ts` (cookie helpers). **Tidak pernah** bisa ke-bundle ke browser (jaminan
  build-time Nitro, bukan cuma konvensi folder).
- `shared/types/` — tipe yang dipakai KEDUA sisi (`app/` dan `server/`): envelope `ApiSuccess`/
  `ApiError`, `MahasiswaProfile`, `Tagihan`. Auto-imported oleh Nuxt di kedua konteks.

## Lint & Typecheck

```bash
npm run lint        # eslint (module @nuxt/eslint, flat config di eslint.config.mjs)
npx nuxi typecheck  # vue-tsc
```
# APP-SIMAWA
