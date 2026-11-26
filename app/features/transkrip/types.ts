export interface TranskripMatakuliah {
  kodeMataKuliah: string | null;
  namaMataKuliah: string | null;
  sks: number | null;
  nilaiSikap: string | null;
  nilaiKuis: string | null;
  nilaiUts: string | null;
  nilaiKu: string | null;
  nilaiKh: string | null;
  nilaiUas: string | null;
  nilaiAngka: string | null;
  nilaiHuruf: string | null;
  nilaiBobot: string | null;
  nilaiMutu: string | null;
  lulus: string | null;
}

export interface TranskripSemester {
  kodeTahunAkademik: string;
  namaTahunAkademik: string | null;
  matakuliah: TranskripMatakuliah[];
}

export interface TranskripResponse {
  // Ringkasan resmi dari tbl_mahasiswa_akm semester terakhir (belum tentu sama dengan hitungan nilai terbaik).
  ringkasan: { ipk: string | null; sksTotal: number | null };
  semester: TranskripSemester[];
}
