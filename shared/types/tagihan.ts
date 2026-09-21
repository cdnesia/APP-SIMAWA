// Baris tabel `tagihan` di database PAYMENT eksternal kampus (via SERVICE-PUBLIC, M2M, dipanggil
// SERVICE-SIMAWA). Dipakai server/api/simawa/[...path].ts (proxy generik) MAUPUN
// app/features/tagihan (tampilan) - makanya hidup di shared/types/.
export interface Tagihan {
  id: number;
  id_record_tagihan: string;
  nomor_tagihan: string;
  npm: string;
  nama_mahasiswa: string;
  tahun_akademik: string;
  waktu_berakhir: string;
  detail_tagihan: { idBipot: string | number; namaBipot: string; nominal: string | number }[];
  total_tagihan: string;
  detail_potongan: { idBipot: string | number; namaBipot: string; nominal: string | number }[] | null;
  total_potongan: string;
  nominal_ditagih: string;
  nominal_terbayar: string;
  jenis_tagihan: string;
  status_aktif: 'Y' | 'T';
}
