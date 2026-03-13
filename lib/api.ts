const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null;
}

export function setToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("token", token);
  }
}

export function clearToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    localStorage.removeItem("remember_me");
    localStorage.removeItem("user_email");
  }
}

function getRememberMe() {
  return typeof window !== "undefined"
    ? localStorage.getItem("remember_me") === "1"
    : false;
}

function setRememberMe(value: boolean) {
  if (typeof window !== "undefined") {
    localStorage.setItem("remember_me", value ? "1" : "0");
  }
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  if (window.location.pathname !== "/") {
    window.location.href = "/";
  }
}

let refreshPromise: Promise<void> | null = null;

async function doRefresh(): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Refresh failed");
  }

  const data = await res.json();

  if (!data?.access_token) {
    throw new Error("No access token returned by refresh");
  }

  setToken(data.access_token);
}

async function ensureRefreshed() {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function request(path: string, options: RequestInit = {}, retry = true) {
  const token = getToken();

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });

  if (res.status === 401) {
    const rememberMe = getRememberMe();

    if (!rememberMe) {
      clearToken();
      redirectToLogin();
      throw new Error("401 Unauthorized");
    }

    if (!retry) {
      clearToken();
      redirectToLogin();
      throw new Error("401 Unauthorized");
    }

    try {
      await ensureRefreshed();
      return request(path, options, false);
    } catch {
      clearToken();
      redirectToLogin();
      throw new Error("Session expired");
    }
  }

  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;

    try {
      const data = await res.json();
      if (data?.detail) msg = data.detail;
    } catch {}

    throw new Error(msg);
  }

  if (res.status === 204) return null;

  return res.json();
}

export const api = {
  login: async (username: string, password: string, remember_me = false) => {
    const body = new URLSearchParams();
    body.set("username", username);
    body.set("password", password);
    body.set("remember_me", String(remember_me));
    body.set("grant_type", "password");

    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      credentials: "include",
    });

    if (!res.ok) {
      let msg = `${res.status} ${res.statusText}`;

      try {
        const data = await res.json();
        if (data?.detail) msg = data.detail;
      } catch {}

      throw new Error(msg);
    }

    const data = await res.json();

    if (!data?.access_token) {
      throw new Error("Login ok, aber kein access_token erhalten");
    }

    setToken(data.access_token);
    setRememberMe(remember_me);

    return data;
  },

  me: () => request("/auth/me", { method: "GET" }),
  status: () => request("/time/status", { method: "GET" }),

  users: () =>
    request("/users", {
      method: "GET",
    }),

  shiftTypes: () =>
    request("/shift-types", {
      method: "GET",
    }),

  clockIn: (shift_id: number | null = null) =>
    request("/time/clock-in", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ shift_id }),
    }),

  clockOut: () =>
    request("/time/clock-out", {
      method: "POST",
    }),

  history: (limit = 10) =>
    request(`/time/history?limit=${limit}`, {
      method: "GET",
    }),

  refresh: () =>
    request("/auth/refresh", {
      method: "POST",
    }),

  logout: async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      clearToken();
      redirectToLogin();
    }
  },

  createUser: (payload: {
    first_name: string;
    last_name: string;
    birth_date?: string | null;
    email: string;
    password: string;
    role?: string;
    is_active?: boolean;
  }) =>
    request("/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  updateUser: (
    userId: number,
    payload: {
      first_name?: string;
      last_name?: string;
      birth_date?: string | null;
      email?: string;
      password?: string;
      role?: string;
      is_active?: boolean;
    }
  ) =>
    request(`/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  deleteUser: (userId: number) =>
    request(`/users/${userId}`, {
      method: "DELETE",
    }),

  createShiftType: (payload: {
    name: string;
    break_minutes_default: number;
    fixed_start_time?: string | null;
    fixed_end_time?: string | null;
    color?: string | null;
    counts_as_work?: boolean;
    is_flexible_default?: boolean;
  }) =>
    request("/shift-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  updateShiftType: (
    shiftTypeId: number,
    payload: {
      name?: string;
      break_minutes_default?: number;
      fixed_start_time?: string | null;
      fixed_end_time?: string | null;
      color?: string | null;
      counts_as_work?: boolean;
      is_flexible_default?: boolean;
    }
  ) =>
    request(`/shift-types/${shiftTypeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  deleteShiftType: (shiftTypeId: number) =>
    request(`/shift-types/${shiftTypeId}`, {
      method: "DELETE",
    }),

  shifts: (from: string, to: string, user_id?: number) => {
    const params = new URLSearchParams();
    params.set("from", from);
    params.set("to", to);
    if (user_id) params.set("user_id", String(user_id));

    return request(`/shifts?${params.toString()}`, {
      method: "GET",
    });
  },

  myShifts: (from: string, to: string) => {
    const params = new URLSearchParams();
    params.set("from", from);
    params.set("to", to);

    return request(`/shifts/me?${params.toString()}`, {
      method: "GET",
    });
  },

  createShift: (payload: {
    user_id: number;
    shift_type_id: number;
    date: string;
    start_time: string;
    end_time: string;
    is_flexible?: boolean;
    notes?: string | null;
  }) =>
    request("/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  updateShift: (
    shiftId: number,
    payload: {
      user_id?: number;
      shift_type_id?: number;
      date?: string;
      start_time?: string;
      end_time?: string;
      is_flexible?: boolean;
      notes?: string | null;
    }
  ) =>
    request(`/shifts/${shiftId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  deleteShift: (shiftId: number) =>
    request(`/shifts/${shiftId}`, {
      method: "DELETE",
    }),
};