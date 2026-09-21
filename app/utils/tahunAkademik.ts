// Format kodeTahunAkademik institusi: 4 digit tahun awal + 1 digit semester (1=Ganjil, 2=Genap).
// Contoh: "20211" = Ganjil TA 2021/2022, "20212" = Genap TA 2021/2022.
export function parseKodeTahunAkademik(kode: string): { tahun: string; semester: string } {
  return { tahun: kode.slice(0, 4), semester: kode.slice(4, 5) };
}

export function buildKodeTahunAkademik(tahun: string, semester: string): string {
  return `${tahun}${semester}`;
}

export function formatSemesterLabel(semester: string): string {
  if (semester === '1') return 'Ganjil';
  if (semester === '2') return 'Genap';
  return semester;
}

export function formatTahunAkademikLabel(kode: string): string {
  const { tahun, semester } = parseKodeTahunAkademik(kode);
  const tahunAwal = Number(tahun);
  if (Number.isNaN(tahunAwal)) return kode;
  return `${tahunAwal}/${tahunAwal + 1} ${formatSemesterLabel(semester)}`;
}
