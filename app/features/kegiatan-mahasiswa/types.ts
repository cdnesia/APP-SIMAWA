export interface KegiatanMahasiswaItem {
  id: number;
  namaKegiatan: string;
  tipe: string;
  biayaPendaftaran: string;
  minimalSks: number;
  minimalSemester: number;
  maksimalNilaiD: number;
  memenuhiSyarat: boolean;
  alasanTidakMemenuhi: string | null;
  periodePendaftaranDibuka: boolean;
  kodeTahunAkademikPeriode: string | null;
  sudahDaftar: boolean;
}

export interface KegiatanMahasiswaResponse {
  items: KegiatanMahasiswaItem[];
}

export interface RiwayatKegiatanItem {
  namaKegiatan: string | null;
  tipe: string | null;
  biayaPendaftaran: string;
  tanggalPendaftaran: string | null;
}

export interface RiwayatKegiatanResponse {
  items: RiwayatKegiatanItem[];
}

export interface PendaftaranKegiatanResult {
  id: number;
  namaKegiatan: string;
  biayaPendaftaran: string;
  tanggalPendaftaran: string | null;
}
