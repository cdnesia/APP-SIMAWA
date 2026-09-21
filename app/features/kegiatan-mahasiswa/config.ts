import { Award, Briefcase, Flag, Users } from '@lucide/vue';
import type { Component } from 'vue';

// Satu sumber kebenaran per jenis kegiatan mahasiswa yang punya alur pendaftaran online -
// dipakai bareng oleh PendaftaranPage, DaftarKegiatanPage, dan AppLayout (nav), supaya menambah
// jenis kegiatan baru cukup nambah 1 entri di sini. `tipe` HARUS persis sama dengan nilai kolom
// tipe di tbl_kegiatan_mahasiswa (lihat kegiatanMahasiswa.service.ts backend SERVICE-SIMAWA).
export interface KegiatanConfig {
  tipe: string;
  label: string;
  labelPanjang: string;
  icon: Component;
  path: string;
}

export const KEGIATAN_KKN: KegiatanConfig = {
  tipe: 'KKN',
  label: 'KKN',
  labelPanjang: 'Kuliah Kerja Nyata (KKN)',
  icon: Flag,
  path: '/pendaftaran/kkn',
};

export const KEGIATAN_PKL: KegiatanConfig = {
  tipe: 'PKL',
  label: 'PKL',
  labelPanjang: 'Praktik Kerja Lapangan (PKL)',
  icon: Briefcase,
  path: '/pendaftaran/pkl',
};

export const KEGIATAN_SEMINAR: KegiatanConfig = {
  tipe: 'SEMINAR PROPOSAL',
  label: 'Seminar Proposal',
  labelPanjang: 'Seminar Proposal',
  icon: Users,
  path: '/pendaftaran/seminar',
};

export const KEGIATAN_SIDANG: KegiatanConfig = {
  tipe: 'SIDANG TUGAS AKHIR',
  label: 'Sidang Tugas Akhir',
  labelPanjang: 'Sidang Tugas Akhir',
  icon: Award,
  path: '/pendaftaran/sidang',
};

export const KEGIATAN_LIST = [KEGIATAN_KKN, KEGIATAN_PKL, KEGIATAN_SEMINAR, KEGIATAN_SIDANG];

// Dipakai route dinamis pages/pendaftaran/[tipe] - slug di URL adalah segmen terakhir path
// (kkn/pkl/seminar/sidang), cari config yang cocok. `null` kalau slug tidak dikenal (caller
// wajib panggil createError({statusCode: 404}) / showError()).
export function getKegiatanConfigBySlug(slug: string): KegiatanConfig | null {
  return KEGIATAN_LIST.find((config) => config.path === `/pendaftaran/${slug}`) ?? null;
}
