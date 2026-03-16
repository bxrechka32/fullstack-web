// =============================================
// api-client.js — API клиент с axios
// Практика 4: Подключение API к фронтенду
// Практика 10: Хранение токенов, interceptors, auto-refresh
// =============================================

const apiClient = axios.create({
  baseURL: "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
    "accept": "application/json",
  },
});

// --- Request interceptor: автоматическая подстановка access-токена (Практика 10) ---
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

// --- Response interceptor: автоматическое обновление токена (Практика 10) ---
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
        const response = await axios.post("http://localhost:3000/api/auth/refresh", {
          refreshToken: refreshToken,
        });

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
  // Auth (Практика 8-9)
  register: async (username, password) => {
    const res = await apiClient.post("/auth/register", { username, password });
    return res.data;
  },

  login: async (username, password) => {
    const res = await apiClient.post("/auth/login", { username, password });
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

  // Products (Практика 2-4)
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
};
