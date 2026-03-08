// Shared auth state helpers — use localStorage so all MFEs share the same session.
// Custom event "authChanged" is dispatched on every state change so MFEs can react.

const AUTH_KEY = "shopzone_auth";

export const getAuth = () => {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setAuth = (token, user) => {
  localStorage.setItem(AUTH_KEY, JSON.stringify({ token, user }));
  window.dispatchEvent(new Event("authChanged"));
};

export const clearAuth = () => {
  localStorage.removeItem(AUTH_KEY);
  window.dispatchEvent(new Event("authChanged"));
};

export const getToken = () => getAuth()?.token || null;
export const getUser  = () => getAuth()?.user  || null;
export const isLoggedIn = () => !!getToken();
