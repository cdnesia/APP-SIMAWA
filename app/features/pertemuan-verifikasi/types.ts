// Pertemuan perkuliahan yang ditugaskan ke mahasiswa ini sebagai verifikator (tbl_jadwal_pertemuan.verifikator = NPM)
// - lihat REST-API-SIMAWA::PertemuanVerifikasiService. Tanggal = ISO UTC ("2026-10-13T00:00:00.000Z").
export type StatusVerifikasi = 'MENUNGGU' | 'TERVERIFIKASI';

export interface PertemuanVerifikasiItem {
  id: string;
  jadwalId: string;
  kodeMataKuliah: string | null;
  namaMataKuliah: string | null;
  kelompok: string | null;
  namaDosen: string | null;
  pertemuan: number;
  bahanKajian: string | null;
  tanggalPelaksanaan: string | null;
  statusVerifikasi: StatusVerifikasi;
  tanggalVerifikasi: string | null;
  // true = MENUNGGU dan pertemuan sudah dilaksanakan (tanggal terisi, wajar, <= hari ini) - boleh diverifikasi sekarang.
  bisaDiverifikasi: boolean;
  // Alasan belum bisa diverifikasi (mis. "Pertemuan belum dilaksanakan"), null kalau bisa / sudah terverifikasi.
  keterangan: string | null;
}

export interface PertemuanVerifikasiResponse {
  kodeTahunAkademik: string;
  namaTahunAkademik: string | null;
  jumlahPerluVerifikasi: number;
  items: PertemuanVerifikasiItem[];
}

export interface VerifikasiPertemuanResponse extends PertemuanVerifikasiResponse {
  jumlahDiverifikasi: number;
}
