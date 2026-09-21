// Definisi asli ada di shared/types/tagihan.ts (dipakai juga oleh server/), di sini cuma
// re-export supaya pola "cari tipe fitur di features/<nama>/types.ts" tetap konsisten.
export type { Tagihan } from '#shared/types/tagihan';
import type { Tagihan } from '#shared/types/tagihan';

export interface RincianTagihanAktif {
  kodeTahunAkademik: string;
  // Penerima KIP Kuliah tidak wajib bayar SPP - lihat SERVICE-SIMAWA::getRincianTagihanAktif.
  isPenerimaKipk: boolean;
  // Status kelayakan kontrak KRS (syarat SPP TA aktif minimal 60%, dikecualikan untuk KIP
  // Kuliah). Gerbang sesungguhnya di-enforce server-side saat POST /krs - field ini cuma untuk
  // ditampilkan (banner status di Dashboard), BUKAN satu-satunya penjagaan.
  persentaseSpp: number | null;
  bolehKontrakKrs: boolean;
  items: Tagihan[];
}
