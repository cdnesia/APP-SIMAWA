// Jarang dipanggil langsung dari client - kebanyakan lewat simawaFetch() secara internal saat
// kena 401, tapi tetap disediakan sebagai endpoint publik untuk kasus composable auth butuh
// trigger manual.
export default defineEventHandler(async (event) => {
  const accessToken = await refreshSimawaSession(event);

  if (!accessToken) {
    setResponseStatus(event, 401);
    return { success: false, message: 'Sesi tidak valid, silakan login kembali' };
  }

  return { success: true, message: 'Sesi diperbarui', data: { accessToken } };
});
