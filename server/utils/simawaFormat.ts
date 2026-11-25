// Penerjemah format REST-API-SIMAWA (Laravel, kunci snake_case) <-> format yang dipakai frontend sejak SERVICE-SIMAWA
// (kunci camelCase) - dipakai SATU tempat (BFF Nitro), jadi komponen & tipe Vue tidak perlu diubah.
//
// Nilai TIDAK pernah diubah, hanya nama kunci. Pengecualian: item tagihan (TagihanResource REST-API, ditandai
// `id_record_tagihan` + `nomor_tagihan`) SENGAJA tetap snake_case - frontend memang memakai format snake_case untuk
// tagihan sejak dulu (lihat shared/types/tagihan.ts), sama seperti SERVICE-SIMAWA meneruskannya apa adanya.

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function isTagihan(v: unknown): boolean {
  return isObj(v) && 'id_record_tagihan' in v && 'nomor_tagihan' in v;
}

export function snakeKeKamel(kunci: string): string {
  return kunci.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

export function kamelKeSnake(kunci: string): string {
  return kunci.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

// Respons REST-API-SIMAWA -> format frontend (camelCase), rekursif.
export function keKamel(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(keKamel);
  if (!isObj(v) || isTagihan(v)) return v;
  return Object.fromEntries(Object.entries(v).map(([k, isi]) => [snakeKeKamel(k), keKamel(isi)]));
}

// Body/query dari frontend (camelCase, mis. jadwalIds, idListsoal) -> format REST-API-SIMAWA (snake_case), rekursif.
export function keSnake(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(keSnake);
  if (!isObj(v)) return v;
  return Object.fromEntries(Object.entries(v).map(([k, isi]) => [kamelKeSnake(k), keSnake(isi)]));
}

export interface ErrorFormatLama {
  success: false;
  message: string;
  code?: string;
  errors?: unknown;
  retryAfterSeconds?: number | null;
}

// Error REST-API-SIMAWA `{ success:false, error:{ code, message, details } }` -> format lama SERVICE-SIMAWA
// `{ success:false, message, errors }` yang dibaca getApiErrorMessage() (app/utils/apiError.ts). `code` ikut disertakan.
export function keErrorLama(json: unknown, cadangan = 'Terjadi kesalahan pada server'): ErrorFormatLama {
  const error = isObj(json) && isObj(json.error) ? json.error : null;
  const message = typeof error?.message === 'string' && error.message !== '' ? error.message : cadangan;
  return {
    success: false,
    message,
    ...(typeof error?.code === 'string' ? { code: error.code } : {}),
    ...(error?.details !== undefined ? { errors: keKamel(error.details) } : {}),
  };
}
