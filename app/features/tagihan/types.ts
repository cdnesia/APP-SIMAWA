// Definisi asli ada di shared/types/tagihan.ts (dipakai juga oleh server/), di sini cuma
// re-export supaya pola "cari tipe fitur di features/<nama>/types.ts" tetap konsisten.
export type { Tagihan } from '#shared/types/tagihan';
import type { Tagihan } from '#shared/types/tagihan';

export interface RincianTagihanAktif {
  kodeTahunAkademik: string;
  // Penerima beasiswa tanggungan penuh (termasuk KIP Kuliah) yang sudah diverifikasi untuk TA
  // aktif - bebas SPP, tagihan SPP-nya dihapus server saat kontrak KRS. Lihat
  // SERVICE-SIMAWA::getRincianTagihanAktif.
  isPenerimaBeasiswaPenuh: boolean;
  // Status kelayakan kontrak KRS (syarat SPP TA aktif minimal 60%, dikecualikan untuk penerima
  // beasiswa penuh terverifikasi). Gerbang sesungguhnya di-enforce server-side saat POST /krs -
  // field ini cuma untuk ditampilkan, BUKAN satu-satunya penjagaan.
  persentaseSpp: number | null;
  bolehKontrakKrs: boolean;
  items: Tagihan[];
  // Jumlah tagihan SPP yang baru dihapus server di request ini (cuma bisa > 0 dari halaman
  // Kontrak KRS, lihat getRincianTagihanAktif({ kontrakKrs: true })).
  jumlahSppDihapus: number;
}
