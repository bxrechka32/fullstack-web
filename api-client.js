// =============================================
// api-client.js — API клиент с axios
// Практика 4: Подключение API к фронтенду
// Практика 7: Логин по email
// Практика 10: Хранение токенов, interceptors, auto-refresh
// Практика 11: Методы для управления пользователями (admin)
// =============================================

const apiClient = axios.create({
  baseURL: "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
    "accept": "application/json",
  },
});

// --- Request interceptor ---
apiClient.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- Response interceptor: auto-refresh ---
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const accessToken = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");
    const originalRequest = error.config;

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!accessToken || !refreshToken) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        return Promise.reject(error);
      }

      try {
        const response = await axios.post("http://localhost:3000/api/auth/refresh", { refreshToken });
        const newAccessToken = response.data.accessToken;
        const newRefreshToken = response.data.refreshToken;
        localStorage.setItem("accessToken", newAccessToken);
        localStorage.setItem("refreshToken", newRefreshToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// --- API-методы ---
const api = {
  // Auth (Практика 7, 8, 9)
  // Практика 7: регистрация принимает email, first_name, last_name; логин по email
  register: async (email, password, first_name, last_name, role = "user") => {
    const res = await apiClient.post("/auth/register", { email, password, first_name, last_name, role });
    return res.data;
  },

  login: async (email, password) => {
    const res = await apiClient.post("/auth/login", { email, password });
    return res.data;
  },

  refresh: async (refreshToken) => {
    const res = await apiClient.post("/auth/refresh", { refreshToken });
    return res.data;
  },

  me: async () => {
    const res = await apiClient.get("/auth/me");
    return res.data;
  },

  // Products (Практика 2, 11)
  getProducts: async () => {
    const res = await apiClient.get("/products");
    return res.data;
  },

  getProductById: async (id) => {
    const res = await apiClient.get(`/products/${id}`);
    return res.data;
  },

  createProduct: async (product) => {
    const res = await apiClient.post("/products", product);
    return res.data;
  },

  updateProduct: async (id, product) => {
    const res = await apiClient.put(`/products/${id}`, product);
    return res.data;
  },

  deleteProduct: async (id) => {
    await apiClient.delete(`/products/${id}`);
  },

  // Users — Практика 11: только для admin
  getUsers: async () => {
    const res = await apiClient.get("/users");
    return res.data;
  },

  getUserById: async (id) => {
    const res = await apiClient.get(`/users/${id}`);
    return res.data;
  },

  updateUser: async (id, data) => {
    const res = await apiClient.put(`/users/${id}`, data);
    return res.data;
  },

  blockUser: async (id) => {
    const res = await apiClient.delete(`/users/${id}`);
    return res.data;
  },
};
