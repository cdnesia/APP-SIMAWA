// Item tagihan PAYMENT = TagihanResource REST-API (via REST-API-SIMAWA). Kunci SENGAJA tetap snake_case (tidak
// dikonversi ke camelCase oleh BFF - lihat server/utils/simawaFormat.ts). Dipakai server/ MAUPUN
// app/features/tagihan (tampilan) - makanya hidup di shared/types/.
// Uang = teks desimal 2 digit ("1500000.00"); waktu ISO 8601 WIB (+07:00).
export interface Tagihan {
  id_record_tagihan: string;
  nomor_tagihan: string;
  nim: string;
  nama_mahasiswa: string;
  nama_fakultas: string | null;
  kode_program_studi: string | null;
  nama_program_studi: string | null;
  id_kelas_perkuliahan: string | null;
  nama_kelas_perkuliahan: string | null;
  tahun_akademik: string;
  jenis_tagihan: string;
  waktu_berakhir: string;
  detail_tagihan: { id_bipot: string | number | null; nama_bipot: string | null; nominal: string | number | null }[];
  total_tagihan: string;
  detail_potongan: { id_bipot: string | number | null; nama_bipot: string | null; nominal: string | number | null }[] | null;
  total_potongan: string;
  nominal_ditagih: string;
  nominal_terbayar: string;
  status_aktif: string;
  lunas: boolean;
  dibuat_pada: string | null;
  diperbarui_pada: string | null;
}
