// Definisi asli ada di shared/types/mahasiswa.ts (dipakai juga oleh server/), di sini cuma
// re-export supaya pola "cari tipe fitur di features/<nama>/types.ts" tetap konsisten.
export type { MahasiswaProfile } from '#shared/types/mahasiswa';
