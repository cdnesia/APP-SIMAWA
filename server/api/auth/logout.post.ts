// Endpoint backend butuh Bearer (bukan cuma cookie) untuk logout - tetap clear cookie Nitro
// sendiri terlepas dari hasil call backend (kalaupun backend gagal/network error, sesi lokal
// harus tetap hilang supaya mahasiswa tidak "kelihatan" masih login di browser).
export default defineEventHandler(async (event) => {
  try {
    await simawaFetch(event, '/auth/logout', { method: 'POST' });
  } catch {
    // diabaikan - cookie tetap dibersihkan di bawah
  } finally {
    clearSimawaSession(event);
  }

  return { success: true, message: 'Logout berhasil', data: null };
});
