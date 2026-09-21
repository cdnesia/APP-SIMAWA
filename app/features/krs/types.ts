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
  semesterList: KrsResponse[];
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
  sudahDikontrak: boolean;
}

export interface JadwalTersediaResponse {
  kodeTahunAkademik: string;
  items: JadwalTersediaItem[];
}
