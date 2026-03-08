const API_BASE_URL =
  (typeof window !== "undefined" && window.API_URL) || "http://localhost:3003";

export const authApi = {
  login: async (username, password) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Login failed");
    return data.data; // { token, user }
  },

  logout: async (token) => {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: { "X-Auth-Token": token },
    });
  },

  me: async (token) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { "X-Auth-Token": token },
    });
    if (!res.ok) throw new Error("Not authenticated");
    const data = await res.json();
    return data.data;
  },

  getUsers: async () => {
    const res = await fetch(`${API_BASE_URL}/api/auth/users`);
    const data = await res.json();
    return data.data;
  },
};
