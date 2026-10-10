export interface KhsMatakuliah {
  jadwalId: string;
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
  lulus: string;
  adaJadwal: boolean;
  sudahEdom: boolean;
  nilaiTerkunci: boolean;
}

export interface KhsResponse {
  kodeTahunAkademik: string;
  namaTahunAkademik: string | null;
  ips: string | null;
  sksSemester: number | null;
  items: KhsMatakuliah[];
}

export interface KhsRiwayatResponse {
  // isCuti: semester berstatus cuti resmi (tbl_mahasiswa_akm status 'C') - ditampilkan sebagai
  // keterangan "Cuti", bukan sekadar "belum ada nilai".
  semesterList: (KhsResponse & { isCuti: boolean })[];
}

export interface IpkTrendItem {
  kodeTahunAkademik: string;
  namaTahunAkademik: string | null;
  // IPK KUMULATIF s.d. semester ini - bukan IPS satu semester.
  ipk: string;
}

export interface IpkTrendResponse {
  items: IpkTrendItem[];
}
