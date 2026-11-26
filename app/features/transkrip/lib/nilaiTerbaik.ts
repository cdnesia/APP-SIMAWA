import type { TranskripSemester } from '../types';

// Kunci posisi baris: "indeksSemester:indeksMatakuliah".
export function kunciBaris(iSemester: number, iMk: number): string {
  return `${iSemester}:${iMk}`;
}

// SAMA dengan CetakService::pilihNilaiTerbaik di REST-API-SIMAWA - supaya yang tampil di halaman cocok dengan PDF.
// Satu baris per kode mata kuliah: bobot tertinggi -> nilai angka tertinggi -> pengambilan TERAKHIR. Baris yang sudah
// dinilai selalu mengalahkan yang belum. Baris tanpa kode mata kuliah tidak digabung.
export function pilihNilaiTerbaik(semester: TranskripSemester[]): Set<string> {
  const terbaik = new Map<string, { kunci: string; peringkat: number[] }>();
  const hasil = new Set<string>();

  semester.forEach((s, iSemester) => {
    s.matakuliah.forEach((mk, iMk) => {
      const kunci = kunciBaris(iSemester, iMk);
      if (!mk.kodeMataKuliah) {
        hasil.add(kunci);
        return;
      }
      const peringkat = [mk.nilaiBobot !== null ? 1 : 0, Number(mk.nilaiBobot ?? 0), Number(mk.nilaiAngka ?? 0)];
      const sekarang = terbaik.get(mk.kodeMataKuliah);
      // >= : semester berurutan naik, jadi nilai sama -> pengambilan terakhir yang menang.
      if (!sekarang || bandingkan(peringkat, sekarang.peringkat) >= 0) {
        terbaik.set(mk.kodeMataKuliah, { kunci, peringkat });
      }
    });
  });

  for (const { kunci } of terbaik.values()) hasil.add(kunci);
  return hasil;
}

function bandingkan(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) {
    const selisih = (a[i] ?? 0) - (b[i] ?? 0);
    if (selisih !== 0) return selisih;
  }
  return 0;
}

// Total SKS, mutu, dan IPK dari baris terpilih yang sudah dinilai (sama dengan hitungan di PDF).
export function hitungRingkasan(semester: TranskripSemester[], terpilih: Set<string>) {
  let sksDinilai = 0;
  let totalMutu = 0;
  semester.forEach((s, iSemester) => {
    s.matakuliah.forEach((mk, iMk) => {
      if (!terpilih.has(kunciBaris(iSemester, iMk)) || mk.sks === null || mk.nilaiBobot === null) return;
      sksDinilai += mk.sks;
      totalMutu += mk.sks * Number(mk.nilaiBobot);
    });
  });
  return {
    jumlahMataKuliah: terpilih.size,
    sksDinilai,
    totalMutu,
    ipk: sksDinilai > 0 ? (totalMutu / sksDinilai).toFixed(2) : null,
  };
}

// Mutu satu baris = SKS x bobot (null bila belum dinilai), tanpa nol berlebih di belakang koma.
export function hitungMutu(sks: number | null, bobot: string | null): string | null {
  if (sks === null || bobot === null) return null;
  return Number((sks * Number(bobot)).toFixed(2)).toString();
}
