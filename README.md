# Digital Store — Интернет-магазин электроники

> Проект выполнен в рамках дисциплины **«Фронтенд и бэкенд разработка»**, 4 семестр, 2025/2026 уч. год.

## Описание

Полнофункциональное веб-приложение интернет-магазина электроники, реализованное на **Express.js** (бэкенд) и **React** (фронтенд). Проект объединяет все практические занятия курса (1–12) в единое решение.

## Покрытие практических занятий

| № | Тема | Реализация |
|---|------|------------|
| 1 | CSS-препроцессоры (SASS) | `styles.scss` — переменные (`$bg`, `$primary`, ...), миксины (`@mixin card`, `@mixin button-variant`), вложенные селекторы |
| 2 | Express сервер, CRUD | `server.js` — Express-сервер с полным CRUD для товаров |
| 3 | JSON и внешние API | `server.js` — JSON-формат данных, REST API, тестирование через Postman / Swagger UI |
| 4 | API + React | `app.js`, `api-client.js` — React SPA, связка клиента и сервера через axios |
| 5 | Swagger (OpenAPI) | `server.js` — swagger-jsdoc + swagger-ui-express, JSDoc-аннотации для всех маршрутов, доступно по `/api-docs` |
| 6 | Контрольная работа №1 | Совокупность практик 1–5 |
| 7 | Подключение к БД | `server.js` — In-memory хранилище (массивы users, products) |
| 8 | JWT аутентификация | `server.js` — регистрация, вход, `authMiddleware`, защищённые маршруты |
| 9 | Refresh-токены | `server.js` — генерация refresh-токена, маршрут `/api/auth/refresh`, ротация токенов |
| 10 | Хранение токенов на фронтенде | `api-client.js` — localStorage, axios interceptors (request + response), автообновление токена |
| 11 | Доработка приложения | Полная интеграция фронтенда и бэкенда |
| 12 | Контрольная работа №2 | Совокупность практик 7–11 |

## Структура проекта (плоская, без вложенных папок)

```
├── server.js          — Бэкенд: Express + JWT + Swagger
├── api-client.js      — API-клиент (axios + interceptors)
├── app.js             — React SPA (компоненты, страницы)
├── index.html         — HTML-точка входа фронтенда
├── styles.scss        — SASS-стили (переменные, миксины, вложенность)
├── styles.css         — Скомпилированный CSS (генерируется из SCSS)
├── package.json       — Зависимости и скрипты
└── README.md          — Описание проекта
```

## API маршруты

### Аутентификация

| Метод | Путь | Описание | Защита |
|-------|------|----------|--------|
| POST | `/api/auth/register` | Регистрация пользователя | — |
| POST | `/api/auth/login` | Вход в систему | — |
| POST | `/api/auth/refresh` | Обновление пары токенов | — |
| GET | `/api/auth/me` | Текущий пользователь | JWT |

### Товары

| Метод | Путь | Описание | Защита |
|-------|------|----------|--------|
| GET | `/api/products` | Список всех товаров | — |
| POST | `/api/products` | Создать товар | JWT |
| GET | `/api/products/:id` | Получить товар по ID | JWT |
| PUT | `/api/products/:id` | Обновить товар | JWT |
| DELETE | `/api/products/:id` | Удалить товар | JWT |

## Карточка товара

Каждый товар содержит:
- **Название** (`name`)
- **Категория** (`category`)
- **Описание** (`description`)
- **Цена** (`price`)
- **Количество на складе** (`stock`)
- **Рейтинг** (`rating`) — опционально

Начальный каталог содержит **12 товаров** из категорий: Смартфоны, Ноутбуки, Наушники, Планшеты, Умные часы, Игровые консоли, Периферия.

## Установка и запуск

### 1. Установка зависимостей

```bash
npm install
```

### 2. Компиляция SASS → CSS (Практика 1)

```bash
npx sass styles.scss styles.css --style compressed
```

### 3. Запуск бэкенда (порт 3000)

```bash
node server.js
```

### 4. Открытие фронтенда

Откройте файл `index.html` в браузере, или запустите:

```bash
npx http-server . -p 3001 -c-1
```

Затем перейдите на `http://localhost:3001`.

### 5. Swagger UI

После запуска сервера документация доступна по адресу:

```
http://localhost:3000/api-docs
```

## Тестирование в Postman (Практика 3)

1. **GET** `http://localhost:3000/api/products` — список товаров
2. **POST** `http://localhost:3000/api/auth/register` — Body: `{"username":"test","password":"123"}`
3. **POST** `http://localhost:3000/api/auth/login` — Body: `{"username":"test","password":"123"}`
4. Скопировать `accessToken` из ответа
5. **POST** `http://localhost:3000/api/products` — Headers: `Authorization: Bearer <token>`, Body: `{"name":"Тест","category":"Тест","description":"Описание","price":999,"stock":5}`
6. **PUT** `http://localhost:3000/api/products/<id>` — обновление товара
7. **DELETE** `http://localhost:3000/api/products/<id>` — удаление товара
8. **POST** `http://localhost:3000/api/auth/refresh` — Body: `{"refreshToken":"<refresh_token>"}`

## Технологии

- **Backend**: Node.js, Express.js, jsonwebtoken, bcrypt, nanoid, cors, swagger-jsdoc, swagger-ui-express
- **Frontend**: React 18 (CDN), Axios (CDN), Babel (CDN)
- **Стили**: SASS (препроцессор) → CSS
