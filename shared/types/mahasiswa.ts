// Dipakai app/ (tampilan profil, termasuk badge penerima beasiswa di dashboard) - hidup di
// shared/types/ (bukan di dalam folder fitur) supaya konsisten dengan pola tipe lain di sini
// (app/features/mahasiswa/types.ts cuma re-export dari sini).
export interface MahasiswaProfile {
  id: string;
  namaMahasiswa: string;
  npm: string;
  tahunAngkatan: string;
  kodeProgramStudi: string;
  namaProgramStudi: string | null;
  jenjang: string | null;
  namaFakultas: string | null;
  kodeKelasKuliah: string | null;
  namaKelasKuliah: string | null;
  jenisKelamin: string | null;
  tempatLahir: string | null;
  tanggalLahir: string | null;
  email: string | null;
  telepon: string | null;
  handphone: string | null;
  status: string;
  // Dicek terhadap tahun akademik AKTIF (bukan "pernah menerima kapanpun") - lihat
  // mahasiswa.service.ts::getStatusBeasiswa di SERVICE-SIMAWA.
  penerimaBeasiswa: boolean;
  namaBeasiswa: string | null;
}
