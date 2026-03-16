// =============================================
// server.js — Бэкенд приложения
// Практика 2: Express сервер, CRUD
// Практика 3: JSON и API
// Практика 4: API + связь с React
// Практика 5: Swagger документация
// Практика 7: Подключение к БД (in-memory)
// Практика 8: JWT аутентификация
// Практика 9: Refresh-токены
// Практика 10: CORS для фронтенда
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

// --- Секреты и время жизни токенов (Практика 8-9) ---
const ACCESS_SECRET = "access_secret_key_digital_store";
const REFRESH_SECRET = "refresh_secret_key_digital_store";
const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";

// --- In-memory данные ---
const users = [];
const refreshTokens = new Set();

// Товары интернет-магазина электроники (>10 шт, Практика 4)
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

// CORS (Практика 4, 10)
app.use(cors({
  origin: ["http://localhost:3001", "http://127.0.0.1:3001"],
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Логирование запросов (Практика 4)
app.use((req, res, next) => {
  res.on("finish", () => {
    console.log(`[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`);
  });
  next();
});

// --- Swagger (Практика 5) ---
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API интернет-магазина электроники",
      version: "1.0.0",
      description: "REST API для управления товарами и аутентификацией пользователей",
    },
    servers: [{ url: `http://localhost:${PORT}`, description: "Локальный сервер" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./server.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --- Помощники ---
function findProductOr404(id, res) {
  const product = products.find((p) => p.id === id);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return null;
  }
  return product;
}

function generateAccessToken(user) {
  return jwt.sign({ sub: user.id, username: user.username }, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

function generateRefreshToken(user) {
  return jwt.sign({ sub: user.id, username: user.username }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

// --- Auth Middleware (Практика 8) ---
function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// =============================================
// AUTH ROUTES (Практика 8-9)
// =============================================

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         username:
 *           type: string
 *       example:
 *         id: "1"
 *         username: "user1"
 *     Product:
 *       type: object
 *       required:
 *         - name
 *         - category
 *         - description
 *         - price
 *         - stock
 *       properties:
 *         id:
 *           type: string
 *           description: Автоматически сгенерированный ID товара
 *         name:
 *           type: string
 *           description: Название товара
 *         category:
 *           type: string
 *           description: Категория товара
 *         description:
 *           type: string
 *           description: Описание товара
 *         price:
 *           type: number
 *           description: Цена товара
 *         stock:
 *           type: integer
 *           description: Количество на складе
 *         rating:
 *           type: number
 *           description: Рейтинг товара
 *       example:
 *         id: "abc123"
 *         name: "iPhone 15 Pro"
 *         category: "Смартфоны"
 *         description: "Флагманский смартфон Apple"
 *         price: 89990
 *         stock: 25
 *         rating: 4.8
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Регистрация нового пользователя
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Пользователь создан
 *       400:
 *         description: Ошибка валидации
 *       409:
 *         description: Пользователь уже существует
 */
app.post("/api/auth/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "username and password are required" });
  }
  const exists = users.some((u) => u.username === username);
  if (exists) {
    return res.status(409).json({ error: "username already exists" });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = { id: String(users.length + 1), username, passwordHash };
  users.push(user);
  res.status(201).json({ id: user.id, username: user.username });
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Вход в систему
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Успешный вход, возвращает accessToken и refreshToken
 *       401:
 *         description: Неверные учетные данные
 */
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "username and password are required" });
  }
  const user = users.find((u) => u.username === username);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  refreshTokens.add(refreshToken);
  res.json({ accessToken, refreshToken });
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Обновление пары токенов
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Новая пара accessToken и refreshToken
 *       401:
 *         description: Невалидный refresh токен
 */
app.post("/api/auth/refresh", (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: "refreshToken is required" });
  }
  if (!refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }
  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = users.find((u) => u.id === payload.sub);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    refreshTokens.delete(refreshToken);
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    refreshTokens.add(newRefreshToken);
    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Получение информации о текущем пользователе
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Данные пользователя
 *       401:
 *         description: Не авторизован
 */
app.get("/api/auth/me", authMiddleware, (req, res) => {
  const userId = req.user.sub;
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json({ id: user.id, username: user.username });
});

// =============================================
// PRODUCTS ROUTES (Практика 2-5, 8)
// =============================================

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создаёт новый товар
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
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *               rating:
 *                 type: number
 *     responses:
 *       201:
 *         description: Товар создан
 *       400:
 *         description: Ошибка валидации
 */
app.post("/api/products", authMiddleware, (req, res) => {
  const { name, category, description, price, stock, rating } = req.body;
  if (!name || !category || !description || price === undefined || stock === undefined) {
    return res.status(400).json({ error: "name, category, description, price and stock are required" });
  }
  const newProduct = {
    id: nanoid(6),
    name: name.trim(),
    category: category.trim(),
    description: description.trim(),
    price: Number(price),
    stock: Number(stock),
    rating: rating !== undefined ? Number(rating) : 0,
  };
  products.push(newProduct);
  res.status(201).json(newProduct);
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Возвращает список всех товаров
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Список товаров
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 */
app.get("/api/products", (req, res) => {
  res.json(products);
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Получает товар по ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID товара
 *     responses:
 *       200:
 *         description: Данные товара
 *       404:
 *         description: Товар не найден
 */
app.get("/api/products/:id", authMiddleware, (req, res) => {
  const product = findProductOr404(req.params.id, res);
  if (!product) return;
  res.json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Обновляет данные товара
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID товара
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *               rating:
 *                 type: number
 *     responses:
 *       200:
 *         description: Обновлённый товар
 *       404:
 *         description: Товар не найден
 */
app.put("/api/products/:id", authMiddleware, (req, res) => {
  const product = findProductOr404(req.params.id, res);
  if (!product) return;
  const { name, category, description, price, stock, rating } = req.body;
  if (name !== undefined) product.name = name.trim();
  if (category !== undefined) product.category = category.trim();
  if (description !== undefined) product.description = description.trim();
  if (price !== undefined) product.price = Number(price);
  if (stock !== undefined) product.stock = Number(stock);
  if (rating !== undefined) product.rating = Number(rating);
  res.json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удаляет товар
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID товара
 *     responses:
 *       204:
 *         description: Товар удалён
 *       404:
 *         description: Товар не найден
 */
app.delete("/api/products/:id", authMiddleware, (req, res) => {
  const id = req.params.id;
  const exists = products.some((p) => p.id === id);
  if (!exists) return res.status(404).json({ error: "Product not found" });
  products = products.filter((p) => p.id !== id);
  res.status(204).send();
});

// --- 404 ---
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// --- Глобальный обработчик ошибок ---
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// --- Запуск ---
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
  console.log(`Swagger UI: http://localhost:${PORT}/api-docs`);
});
