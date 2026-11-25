// Logout: REST-API-SIMAWA mencabut SEMUA token akun (POST /v1/mahasiswa/logout, butuh Bearer) - cookie Nitro tetap
// dibersihkan terlepas dari hasil call backend (kalaupun backend gagal/network error, sesi lokal harus tetap hilang
// supaya mahasiswa tidak "kelihatan" masih login di browser).
export default defineEventHandler(async (event) => {
  try {
    if (getSimawaAccessToken(event) || getSimawaRefreshToken(event)) {
      await simawaFetch(event, '/mahasiswa/logout', { method: 'POST' });
    }
  } catch {
    // diabaikan - cookie tetap dibersihkan di bawah
  } finally {
    clearSimawaSession(event);
  }

  return { success: true, message: 'Logout berhasil', data: null };
});
