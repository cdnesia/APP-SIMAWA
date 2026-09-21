export interface JadwalKuliahItem {
  jadwalId: string;
  hariId: number | null;
  namaHari: string | null;
  jamMulai: string | null;
  jamSelesai: string | null;
  kelompok: string | null;
  ruangId: number | null;
  namaRuang: string | null;
  dosenId: number | null;
  namaDosen: string | null;
  kodeMataKuliah: string | null;
  namaMataKuliah: string | null;
  sks: number | null;
}

export interface JadwalKuliahResponse {
  kodeTahunAkademik: string;
  namaTahunAkademik: string | null;
  items: JadwalKuliahItem[];
}
