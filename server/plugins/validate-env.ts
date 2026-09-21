import { z } from 'zod';

// Validasi runtimeConfig server-only sekali saat Nitro startup - supaya env yang belum di-set/
// salah format ketahuan cepat & jelas (fail fast), bukan baru meledak nanti pas ada request yang
// kebetulan lewat jalur kode itu.
const envSchema = z.object({
  simawaApiBase: z.url('SIMAWA_API_BASE harus URL valid, mis. http://localhost:4000/api'),
  serviceSecret: z.string().min(1, 'SERVICE_SECRET wajib diisi - lihat .env.example'),
});

export default defineNitroPlugin(() => {
  const config = useRuntimeConfig();
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    const issues = z.prettifyError(parsed.error);
    throw new Error(`Environment variable tidak valid, cek .env / .env.example:\n${issues}`);
  }
});
