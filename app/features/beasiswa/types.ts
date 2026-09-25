export type StatusVerifikasiBeasiswa = 'TERVERIFIKASI' | 'DIBATALKAN' | 'BELUM_DIVERIFIKASI';

// Satu item = satu tahun akademik yang dijamin satu beasiswa (lihat
// SERVICE-SIMAWA::getRiwayatBeasiswa - baris penerima yang menjamin beberapa TA dipecah per TA).
export interface RiwayatBeasiswaItem {
  kodeTahunAkademik: string;
  namaBeasiswa: string | null;
  namaLembaga: string | null;
  jenisTanggungan: string | null;
  jumlahJaminan: string;
  statusVerifikasi: StatusVerifikasiBeasiswa;
  isTahunAktif: boolean;
}
