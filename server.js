// =============================================
// server.js — Бэкенд приложения
// Практика 2: Express сервер, CRUD
// Практика 3: JSON и API
// Практика 4: API + связь с React
// Практика 5: Swagger документация
// Практика 7: Поля пользователя (email, first_name, last_name), email как логин
// Практика 8: JWT аутентификация
// Практика 9: Refresh-токены
// Практика 10: CORS для фронтенда
// Практика 11: RBAC — роли user / seller / admin
// =============================================

const express = require("express");
const { nanoid } = require("nanoid");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const app = express();
const PORT = 3000;

// --- Секреты и время жизни токенов ---
const ACCESS_SECRET = "access_secret_key_digital_store";
const REFRESH_SECRET = "refresh_secret_key_digital_store";
const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";

// --- In-memory данные ---
// Практика 7: расширенная модель пользователя (email, first_name, last_name, role)
const users = [];
const refreshTokens = new Set();

let products = [
  { id: nanoid(6), name: "iPhone 15 Pro", category: "Смартфоны", description: "Флагманский смартфон Apple с чипом A17 Pro", price: 89990, stock: 25, rating: 4.8 },
  { id: nanoid(6), name: "Samsung Galaxy S24 Ultra", category: "Смартфоны", description: "Топовый Android-смартфон с AI-функциями", price: 94990, stock: 18, rating: 4.7 },
  { id: nanoid(6), name: "MacBook Air M3", category: "Ноутбуки", description: "Тонкий и лёгкий ноутбук с чипом Apple M3", price: 109990, stock: 12, rating: 4.9 },
  { id: nanoid(6), name: "ASUS ROG Strix G16", category: "Ноутбуки", description: "Игровой ноутбук с RTX 4070 и экраном 165 Гц", price: 129990, stock: 8, rating: 4.6 },
  { id: nanoid(6), name: "Sony WH-1000XM5", category: "Наушники", description: "Беспроводные наушники с лучшим шумоподавлением", price: 29990, stock: 30, rating: 4.8 },
  { id: nanoid(6), name: "AirPods Pro 2", category: "Наушники", description: "TWS-наушники Apple с адаптивным шумоподавлением", price: 19990, stock: 45, rating: 4.7 },
  { id: nanoid(6), name: "iPad Air M2", category: "Планшеты", description: "Планшет Apple с чипом M2 и экраном 11 дюймов", price: 59990, stock: 15, rating: 4.8 },
  { id: nanoid(6), name: "Samsung Galaxy Tab S9", category: "Планшеты", description: "Планшет Samsung с AMOLED-экраном и S Pen", price: 54990, stock: 10, rating: 4.5 },
  { id: nanoid(6), name: "Apple Watch Ultra 2", category: "Умные часы", description: "Премиальные смарт-часы для экстремальных условий", price: 64990, stock: 20, rating: 4.9 },
  { id: nanoid(6), name: "PlayStation 5 Slim", category: "Игровые консоли", description: "Компактная версия PS5 с SSD 1 ТБ", price: 47990, stock: 22, rating: 4.6 },
  { id: nanoid(6), name: "Logitech MX Master 3S", category: "Периферия", description: "Эргономичная беспроводная мышь для профессионалов", price: 7990, stock: 40, rating: 4.7 },
  { id: nanoid(6), name: "Keychron K3 Pro", category: "Периферия", description: "Низкопрофильная механическая клавиатура 75%", price: 8490, stock: 35, rating: 4.5 },
];

// --- Middleware ---
app.use(express.json());

app.use(cors({
  origin: ["http://localhost:3001", "http://127.0.0.1:3001"],
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use((req, res, next) => {
  res.on("finish", () => {
    console.log(`[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`);
  });
  next();
});

// --- Swagger ---
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Digital Store API",
      version: "1.0.0",
      description: "REST API с RBAC (user / seller / admin)",
    },
    servers: [{ url: `http://localhost:${PORT}` }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  },
  apis: ["./server.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --- Helpers ---
function findProductOr404(id, res) {
  const p = products.find((p) => p.id === id);
  if (!p) { res.status(404).json({ error: "Product not found" }); return null; }
  return p;
}

// Практика 11: токен содержит роль
function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, email: user.email, role: user.role },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, email: user.email, role: user.role },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
}

// --- Auth Middleware ---
function authMiddleware(req, res, next) {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token)
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  try {
    req.user = jwt.verify(token, ACCESS_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Практика 11: Role Middleware
function roleMiddleware(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role))
      return res.status(403).json({ error: "Forbidden: insufficient role" });
    next();
  };
}

// =============================================
// AUTH ROUTES
// =============================================

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         email: { type: string }
 *         first_name: { type: string }
 *         last_name: { type: string }
 *         role: { type: string, enum: [user, seller, admin] }
 *         blocked: { type: boolean }
 *     Product:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         name: { type: string }
 *         category: { type: string }
 *         description: { type: string }
 *         price: { type: number }
 *         stock: { type: integer }
 *         rating: { type: number }
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Регистрация (Практика 7 — email, first_name, last_name; Практика 11 — role)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, first_name, last_name]
 *             properties:
 *               email: { type: string, example: "ivan@example.com" }
 *               password: { type: string, example: "123456" }
 *               first_name: { type: string, example: "Иван" }
 *               last_name: { type: string, example: "Петров" }
 *               role: { type: string, enum: [user, seller, admin], example: "user" }
 *     responses:
 *       201: { description: Пользователь создан }
 *       400: { description: Ошибка валидации }
 *       409: { description: Email уже занят }
 */
app.post("/api/auth/register", async (req, res) => {
  const { email, password, first_name, last_name, role } = req.body;

  if (!email || !password || !first_name || !last_name)
    return res.status(400).json({ error: "email, password, first_name and last_name are required" });

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: "Invalid email format" });

  if (users.some((u) => u.email === email.toLowerCase()))
    return res.status(409).json({ error: "Email already exists" });

  const allowedRoles = ["user", "seller", "admin"];
  const userRole = allowedRoles.includes(role) ? role : "user";
  const passwordHash = await bcrypt.hash(password, 10);

  const user = {
    id: String(users.length + 1),
    email: email.toLowerCase(),
    username: email.toLowerCase(),
    first_name: first_name.trim(),
    last_name: last_name.trim(),
    passwordHash,
    role: userRole,
    blocked: false,
  };
  users.push(user);
  res.status(201).json({ id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, role: user.role });
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Вход по email (Практика 7)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: "ivan@example.com" }
 *               password: { type: string, example: "123456" }
 *     responses:
 *       200: { description: accessToken + refreshToken }
 *       401: { description: Неверные учетные данные }
 *       403: { description: Аккаунт заблокирован }
 */
app.post("/api/auth/login", async (req, res) => {
  const { email, username, password } = req.body;
  const loginEmail = (email || username || "").toLowerCase();

  if (!loginEmail || !password)
    return res.status(400).json({ error: "email and password are required" });

  const user = users.find((u) => u.email === loginEmail);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  if (user.blocked) return res.status(403).json({ error: "Account is blocked" });

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  refreshTokens.add(refreshToken);
  res.json({ accessToken, refreshToken });
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Обновление токенов
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: Новая пара токенов }
 *       401: { description: Невалидный refresh токен }
 */
app.post("/api/auth/refresh", (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: "refreshToken is required" });
  if (!refreshTokens.has(refreshToken)) return res.status(401).json({ error: "Invalid refresh token" });
  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = users.find((u) => u.id === payload.sub);
    if (!user) return res.status(401).json({ error: "User not found" });
    refreshTokens.delete(refreshToken);
    const newAccess = generateAccessToken(user);
    const newRefresh = generateRefreshToken(user);
    refreshTokens.add(newRefresh);
    res.json({ accessToken: newAccess, refreshToken: newRefresh });
  } catch {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Текущий пользователь
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Данные пользователя }
 *       401: { description: Не авторизован }
 */
app.get("/api/auth/me", authMiddleware, (req, res) => {
  const user = users.find((u) => u.id === req.user.sub);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ id: user.id, email: user.email, username: user.username, first_name: user.first_name, last_name: user.last_name, role: user.role });
});

// =============================================
// USERS ROUTES (Практика 11 — только admin)
// =============================================

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Список пользователей [admin]
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Массив пользователей }
 *       403: { description: Доступ запрещён }
 */
app.get("/api/users", authMiddleware, roleMiddleware(["admin"]), (req, res) => {
  res.json(users.map(({ id, email, first_name, last_name, role, blocked }) =>
    ({ id, email, first_name, last_name, role, blocked })
  ));
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Пользователь по id [admin]
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Данные пользователя }
 *       404: { description: Не найден }
 */
app.get("/api/users/:id", authMiddleware, roleMiddleware(["admin"]), (req, res) => {
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  const { id, email, first_name, last_name, role, blocked } = user;
  res.json({ id, email, first_name, last_name, role, blocked });
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Обновить пользователя [admin]
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name: { type: string }
 *               last_name: { type: string }
 *               role: { type: string, enum: [user, seller, admin] }
 *     responses:
 *       200: { description: Обновлённый пользователь }
 *       404: { description: Не найден }
 */
app.put("/api/users/:id", authMiddleware, roleMiddleware(["admin"]), (req, res) => {
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  const { first_name, last_name, role } = req.body;
  if (first_name !== undefined) user.first_name = first_name.trim();
  if (last_name !== undefined) user.last_name = last_name.trim();
  if (role !== undefined && ["user", "seller", "admin"].includes(role)) user.role = role;
  const { id, email, blocked } = user;
  res.json({ id, email, first_name: user.first_name, last_name: user.last_name, role: user.role, blocked });
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Заблокировать пользователя [admin]
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Пользователь заблокирован }
 *       404: { description: Не найден }
 */
app.delete("/api/users/:id", authMiddleware, roleMiddleware(["admin"]), (req, res) => {
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  user.blocked = true;
  res.json({ message: "User blocked", id: user.id });
});

// =============================================
// PRODUCTS ROUTES (Практика 2, 11)
// =============================================

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создать товар [seller, admin]
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, category, description, price, stock]
 *             properties:
 *               name: { type: string }
 *               category: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *               stock: { type: integer }
 *               rating: { type: number }
 *     responses:
 *       201: { description: Товар создан }
 *       403: { description: Доступ запрещён }
 */
app.post("/api/products", authMiddleware, roleMiddleware(["seller", "admin"]), (req, res) => {
  const { name, category, description, price, stock, rating } = req.body;
  if (!name || !category || !description || price === undefined || stock === undefined)
    return res.status(400).json({ error: "name, category, description, price and stock are required" });
  const p = { id: nanoid(6), name: name.trim(), category: category.trim(), description: description.trim(), price: Number(price), stock: Number(stock), rating: rating !== undefined ? Number(rating) : 0 };
  products.push(p);
  res.status(201).json(p);
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Список товаров [user, seller, admin]
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Список товаров }
 */
app.get("/api/products", authMiddleware, roleMiddleware(["user", "seller", "admin"]), (req, res) => {
  res.json(products);
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Товар по id [user, seller, admin]
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Данные товара }
 *       404: { description: Не найден }
 */
app.get("/api/products/:id", authMiddleware, roleMiddleware(["user", "seller", "admin"]), (req, res) => {
  const p = findProductOr404(req.params.id, res);
  if (!p) return;
  res.json(p);
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Обновить товар [seller, admin]
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               category: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *               stock: { type: integer }
 *               rating: { type: number }
 *     responses:
 *       200: { description: Обновлённый товар }
 *       403: { description: Доступ запрещён }
 */
app.put("/api/products/:id", authMiddleware, roleMiddleware(["seller", "admin"]), (req, res) => {
  const p = findProductOr404(req.params.id, res);
  if (!p) return;
  const { name, category, description, price, stock, rating } = req.body;
  if (name !== undefined) p.name = name.trim();
  if (category !== undefined) p.category = category.trim();
  if (description !== undefined) p.description = description.trim();
  if (price !== undefined) p.price = Number(price);
  if (stock !== undefined) p.stock = Number(stock);
  if (rating !== undefined) p.rating = Number(rating);
  res.json(p);
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удалить товар [admin]
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Товар удалён }
 *       403: { description: Доступ запрещён }
 */
app.delete("/api/products/:id", authMiddleware, roleMiddleware(["admin"]), (req, res) => {
  const id = req.params.id;
  if (!products.some((p) => p.id === id)) return res.status(404).json({ error: "Product not found" });
  products = products.filter((p) => p.id !== id);
  res.status(204).send();
});

// --- 404 / Error Handler ---
app.use((req, res) => res.status(404).json({ error: "Not found" }));
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
  console.log(`Swagger UI: http://localhost:${PORT}/api-docs`);
});
