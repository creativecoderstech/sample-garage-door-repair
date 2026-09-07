export const STAFF_ID_TOKEN_KEY = "garage.google.id_token";

export const staffToken = () => sessionStorage.getItem(STAFF_ID_TOKEN_KEY) || "";

export function staffFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = staffToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}