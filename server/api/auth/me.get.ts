// Profil akun yang login (id, name, email, roles, permissions) - GET /v1/saya/sesi REST-API-SIMAWA.
export default defineEventHandler(async (event) => {
  const res = await simawaFetch(event, '/saya/sesi');
  return teruskanRespons(event, res);
});
