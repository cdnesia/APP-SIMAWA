export default defineEventHandler(async (event) => {
  const res = await simawaFetch(event, '/auth/me');
  const text = await res.text();
  setResponseStatus(event, res.status);
  setResponseHeader(event, 'Content-Type', 'application/json');
  return text;
});
