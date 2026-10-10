export interface KrsItem {
  kodeMataKuliah: string | null;
  namaMataKuliah: string | null;
  sks: number | null;
  semesterMataKuliah: number | null;
  hariId: number | null;
  namaHari: string | null;
  jamMulai: string | null;
  jamSelesai: string | null;
  ruangId: number | null;
  namaRuang: string | null;
  dosenId: number | null;
  namaDosen: string | null;
  persetujuanPa: string;
  datetimePersetujuanPa: string | null;
}

export interface KrsResponse {
  kodeTahunAkademik: string;
  totalSks: number;
  items: KrsItem[];
}

export interface KrsRiwayatResponse {
  // isCuti: semester berstatus cuti resmi (tbl_mahasiswa_akm status 'C') - ditampilkan sebagai
  // keterangan "Cuti", bukan sekadar "belum ada mata kuliah".
  semesterList: (KrsResponse & { isCuti: boolean })[];
}

export interface JadwalTersediaItem {
  jadwalId: string;
  kodeMataKuliah: string | null;
  namaMataKuliah: string | null;
  sks: number | null;
  semesterMataKuliah: number | null;
  hariId: number | null;
  namaHari: string | null;
  jamMulai: string | null;
  jamSelesai: string | null;
  kelompok: string | null;
  ruangId: number | null;
  namaRuang: string | null;
  dosenId: number | null;
  namaDosen: string | null;
  /** Kuota ruang - null kalau kuota ruang belum diisi / tidak diketahui (kelas tidak dibatasi). */
  kapasitas: number | null;
  jumlahPeserta: number;
  /** null kalau kapasitas null. */
  sisaKursi: number | null;
  sudahDikontrak: boolean;
}

export interface JadwalTersediaResponse {
  kodeTahunAkademik: string;
  items: JadwalTersediaItem[];
}
