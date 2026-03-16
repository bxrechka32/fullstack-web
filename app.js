// =============================================
// app.js — React SPA приложение
// Практика 4: React + API (CRUD)
// Практика 8: JWT аутентификация (login/register)
// Практика 9: Refresh-токены
// Практика 10: Хранение токенов на фронтенде
// =============================================

const { useState, useEffect, useCallback } = React;

// ========== Toast компонент ==========
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`toast toast--${type}`}>
      {message}
    </div>
  );
}

// ========== Рейтинг звёздами ==========
function Stars({ rating }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  let stars = "★".repeat(full) + (half ? "½" : "") + "☆".repeat(5 - full - (half ? 1 : 0));
  return <span className="stars">{stars} {rating}</span>;
}

// ========== Строка товара ==========
function ProductItem({ product, onEdit, onDelete }) {
  return (
    <div className="productRow">
      <div className="productMain">
        <div className="productId">#{product.id}</div>
        <div className="productName">{product.name}</div>
        <div className="productCategory">{product.category}</div>
        <div className="productPrice">{product.price.toLocaleString("ru-RU")} ₽</div>
        <div className="productStock">Склад: {product.stock} шт.</div>
        <Stars rating={product.rating || 0} />
      </div>
      <div className="productActions">
        <button className="btn btn--sm" onClick={() => onEdit(product)}>Ред.</button>
        <button className="btn btn--sm btn--danger" onClick={() => onDelete(product.id)}>Удалить</button>
      </div>
    </div>
  );
}

// ========== Список товаров ==========
function ProductList({ products, onEdit, onDelete }) {
  if (!products.length) {
    return <div className="empty">Товаров пока нет</div>;
  }
  return (
    <div className="list">
      {products.map((p) => (
        <ProductItem key={p.id} product={p} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}

// ========== Модальное окно товара ==========
function ProductModal({ open, mode, initialProduct, onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [rating, setRating] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(initialProduct?.name ?? "");
    setCategory(initialProduct?.category ?? "");
    setDescription(initialProduct?.description ?? "");
    setPrice(initialProduct?.price != null ? String(initialProduct.price) : "");
    setStock(initialProduct?.stock != null ? String(initialProduct.stock) : "");
    setRating(initialProduct?.rating != null ? String(initialProduct.rating) : "");
  }, [open, initialProduct]);

  if (!open) return null;

  const title = mode === "edit" ? "Редактирование товара" : "Создание товара";

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) { alert("Введите название"); return; }
    if (!category.trim()) { alert("Введите категорию"); return; }
    if (!description.trim()) { alert("Введите описание"); return; }
    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) { alert("Введите корректную цену"); return; }
    const parsedStock = Number(stock);
    if (!Number.isFinite(parsedStock) || parsedStock < 0) { alert("Введите корректное количество"); return; }

    onSubmit({
      id: initialProduct?.id,
      name: trimmedName,
      category: category.trim(),
      description: description.trim(),
      price: parsedPrice,
      stock: parsedStock,
      rating: rating ? Number(rating) : 0,
    });
  };

  return (
    <div className="backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()} role="dialog">
        <div className="modal__header">
          <div className="modal__title">{title}</div>
          <button className="iconBtn" onClick={onClose}>✕</button>
        </div>
        <form className="form" onSubmit={handleSubmit}>
          <label className="label">
            Название
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="iPhone 15 Pro" autoFocus />
          </label>
          <label className="label">
            Категория
            <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Смартфоны" />
          </label>
          <label className="label">
            Описание
            <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Описание товара..." />
          </label>
          <label className="label">
            Цена (₽)
            <input className="input" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="89990" inputMode="numeric" />
          </label>
          <label className="label">
            Количество на складе
            <input className="input" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="25" inputMode="numeric" />
          </label>
          <label className="label">
            Рейтинг (0-5)
            <input className="input" value={rating} onChange={(e) => setRating(e.target.value)} placeholder="4.5" inputMode="decimal" />
          </label>
          <div className="modal__footer">
            <button type="button" className="btn" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn btn--primary">{mode === "edit" ? "Сохранить" : "Создать"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========== Страница авторизации ==========
function AuthPage({ onAuth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Введите логин и пароль");
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        const data = await api.login(username.trim(), password);
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        onAuth();
      } else {
        await api.register(username.trim(), password);
        // После регистрации сразу логинимся
        const data = await api.login(username.trim(), password);
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        onAuth();
      }
    } catch (err) {
      const msg = err.response?.data?.error || "Ошибка сервера";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="authPage">
      <div className="authCard">
        <h1 className="authTitle">Digital Store</h1>
        <p className="authSubtitle">{isLogin ? "Вход в систему" : "Регистрация"}</p>
        {error && <div className="toast toast--error" style={{ position: "static", marginBottom: 12 }}>{error}</div>}
        <form className="authForm" onSubmit={handleSubmit}>
          <label className="label">
            Логин
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" autoFocus />
          </label>
          <label className="label">
            Пароль
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" />
          </label>
          <button type="submit" className="btn btn--primary" style={{ width: "100%", padding: "12px", fontSize: 15 }} disabled={loading}>
            {loading ? "Загрузка..." : isLogin ? "Войти" : "Зарегистрироваться"}
          </button>
        </form>
        <div className="authSwitch">
          {isLogin ? (
            <span>Нет аккаунта? <a onClick={() => { setIsLogin(false); setError(""); }}>Зарегистрироваться</a></span>
          ) : (
            <span>Уже есть аккаунт? <a onClick={() => { setIsLogin(true); setError(""); }}>Войти</a></span>
          )}
        </div>
      </div>
    </div>
  );
}

// ========== Главная страница товаров ==========
function ProductsPage({ currentUser, onLogout }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingProduct, setEditingProduct] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      showToast("Ошибка загрузки товаров", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const openCreate = () => {
    setModalMode("create");
    setEditingProduct(null);
    setModalOpen(true);
  };

  const openEdit = (product) => {
    setModalMode("edit");
    setEditingProduct(product);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingProduct(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Удалить товар?")) return;
    try {
      await api.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      showToast("Товар удалён");
    } catch (err) {
      showToast("Ошибка удаления", "error");
    }
  };

  const handleSubmitModal = async (payload) => {
    try {
      if (modalMode === "create") {
        const newProduct = await api.createProduct(payload);
        setProducts((prev) => [...prev, newProduct]);
        showToast("Товар создан");
      } else {
        const updated = await api.updateProduct(payload.id, payload);
        setProducts((prev) => prev.map((p) => (p.id === payload.id ? updated : p)));
        showToast("Товар обновлён");
      }
      closeModal();
    } catch (err) {
      showToast("Ошибка сохранения", "error");
    }
  };

  return (
    <div className="page">
      <header className="header">
        <div className="header__inner">
          <div className="brand">Digital Store</div>
          <div className="header__right">
            <div className="userInfo">
              <span className="username">{currentUser?.username}</span>
            </div>
            <button className="btn btn--sm btn--danger" onClick={onLogout}>Выйти</button>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="container">
          <div className="toolbar">
            <h1 className="title">Товары</h1>
            <div className="toolbar-actions">
              <button className="btn btn--primary" onClick={openCreate}>+ Добавить товар</button>
            </div>
          </div>
          {loading ? (
            <div className="empty">Загрузка...</div>
          ) : (
            <ProductList products={products} onEdit={openEdit} onDelete={handleDelete} />
          )}
        </div>
      </main>

      <footer className="footer">
        <div className="footer__inner">© {new Date().getFullYear()} Digital Store — Практические занятия, Фронтенд и бэкенд разработка</div>
      </footer>

      <ProductModal
        open={modalOpen}
        mode={modalMode}
        initialProduct={editingProduct}
        onClose={closeModal}
        onSubmit={handleSubmitModal}
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ========== Корневой компонент ==========
function App() {
  const [authed, setAuthed] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [checking, setChecking] = useState(true);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setChecking(false);
      return;
    }
    try {
      const user = await api.me();
      setCurrentUser(user);
      setAuthed(true);
    } catch (err) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleAuth = () => {
    checkAuth();
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setAuthed(false);
    setCurrentUser(null);
  };

  if (checking) {
    return (
      <div className="authPage">
        <div className="empty">Загрузка...</div>
      </div>
    );
  }

  if (!authed) {
    return <AuthPage onAuth={handleAuth} />;
  }

  return <ProductsPage currentUser={currentUser} onLogout={handleLogout} />;
}

// ========== Рендер ==========
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(App));
