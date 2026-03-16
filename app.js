// =============================================
// app.js — React SPA
// Практика 4: React + API (CRUD)
// Практика 7: email, first_name, last_name
// Практика 8: JWT аутентификация
// Практика 9: Refresh-токены
// Практика 10: Хранение токенов на фронтенде
// Практика 11: RBAC — видимость UI по роли, панель управления пользователями
// =============================================

const { useState, useEffect, useCallback } = React;

// ========== Утилита: роль из токена ==========
function getRoleFromToken() {
  try {
    const token = localStorage.getItem("accessToken");
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role || null;
  } catch {
    return null;
  }
}

// ========== Toast ==========
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return <div className={`toast toast--${type}`}>{message}</div>;
}

// ========== Stars ==========
function Stars({ rating }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const stars = "★".repeat(full) + (half ? "½" : "") + "☆".repeat(5 - full - (half ? 1 : 0));
  return <span className="stars">{stars} {rating}</span>;
}

// ========== Бейдж роли ==========
const ROLE_LABELS = { user: "Пользователь", seller: "Продавец", admin: "Администратор" };
const ROLE_COLORS = { user: "roleUser", seller: "roleSeller", admin: "roleAdmin" };

function RoleBadge({ role }) {
  return (
    <span className={`roleBadge ${ROLE_COLORS[role] || ""}`}>
      {ROLE_LABELS[role] || role}
    </span>
  );
}

// ========== Строка товара ==========
function ProductItem({ product, onEdit, onDelete, canEdit, canDelete }) {
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
        {canEdit && <button className="btn btn--sm" onClick={() => onEdit(product)}>Ред.</button>}
        {canDelete && <button className="btn btn--sm btn--danger" onClick={() => onDelete(product.id)}>Удалить</button>}
      </div>
    </div>
  );
}

// ========== Список товаров ==========
function ProductList({ products, onEdit, onDelete, role }) {
  const canEdit = role === "seller" || role === "admin";
  const canDelete = role === "admin";

  if (!products.length) return <div className="empty">Товаров пока нет</div>;
  return (
    <div className="list">
      {products.map((p) => (
        <ProductItem key={p.id} product={p} onEdit={onEdit} onDelete={onDelete} canEdit={canEdit} canDelete={canDelete} />
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) { alert("Введите название"); return; }
    if (!category.trim()) { alert("Введите категорию"); return; }
    if (!description.trim()) { alert("Введите описание"); return; }
    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) { alert("Введите корректную цену"); return; }
    const parsedStock = Number(stock);
    if (!Number.isFinite(parsedStock) || parsedStock < 0) { alert("Введите корректное количество"); return; }
    onSubmit({ id: initialProduct?.id, name: name.trim(), category: category.trim(), description: description.trim(), price: parsedPrice, stock: parsedStock, rating: rating ? Number(rating) : 0 });
  };

  return (
    <div className="backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()} role="dialog">
        <div className="modal__header">
          <div className="modal__title">{mode === "edit" ? "Редактирование товара" : "Создание товара"}</div>
          <button className="iconBtn" onClick={onClose}>✕</button>
        </div>
        <form className="form" onSubmit={handleSubmit}>
          <label className="label">Название<input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="iPhone 15 Pro" autoFocus /></label>
          <label className="label">Категория<input className="input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Смартфоны" /></label>
          <label className="label">Описание<textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Описание товара..." /></label>
          <label className="label">Цена (₽)<input className="input" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="89990" inputMode="numeric" /></label>
          <label className="label">Количество на складе<input className="input" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="25" inputMode="numeric" /></label>
          <label className="label">Рейтинг (0-5)<input className="input" value={rating} onChange={(e) => setRating(e.target.value)} placeholder="4.5" inputMode="decimal" /></label>
          <div className="modal__footer">
            <button type="button" className="btn" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn btn--primary">{mode === "edit" ? "Сохранить" : "Создать"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========== Модальное окно редактирования пользователя (admin) ==========
function UserEditModal({ open, user, onClose, onSubmit }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("user");

  useEffect(() => {
    if (!open || !user) return;
    setFirstName(user.first_name || "");
    setLastName(user.last_name || "");
    setRole(user.role || "user");
  }, [open, user]);

  if (!open || !user) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(user.id, { first_name: firstName.trim(), last_name: lastName.trim(), role });
  };

  return (
    <div className="backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()} role="dialog">
        <div className="modal__header">
          <div className="modal__title">Редактирование пользователя</div>
          <button className="iconBtn" onClick={onClose}>✕</button>
        </div>
        <form className="form" onSubmit={handleSubmit}>
          <label className="label">Email<input className="input" value={user.email} disabled style={{ opacity: 0.5 }} /></label>
          <label className="label">Имя<input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></label>
          <label className="label">Фамилия<input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} /></label>
          <label className="label">
            Роль
            <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="user">Пользователь</option>
              <option value="seller">Продавец</option>
              <option value="admin">Администратор</option>
            </select>
          </label>
          <div className="modal__footer">
            <button type="button" className="btn" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn btn--primary">Сохранить</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========== Страница управления пользователями (admin, Практика 11) ==========
function UsersPage({ onBack }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [editUser, setEditUser] = useState(null);

  const showToast = (msg, type = "success") => setToast({ message: msg, type });

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getUsers();
      setUsers(data);
    } catch {
      showToast("Ошибка загрузки пользователей", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleBlock = async (id) => {
    if (!window.confirm("Заблокировать пользователя?")) return;
    try {
      await api.blockUser(id);
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, blocked: true } : u));
      showToast("Пользователь заблокирован");
    } catch {
      showToast("Ошибка блокировки", "error");
    }
  };

  const handleEditSubmit = async (id, data) => {
    try {
      const updated = await api.updateUser(id, data);
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...updated } : u));
      setEditUser(null);
      showToast("Пользователь обновлён");
    } catch {
      showToast("Ошибка обновления", "error");
    }
  };

  return (
    <div className="page">
      <header className="header">
        <div className="header__inner">
          <div className="brand">Digital Store</div>
          <div className="header__right">
            <button className="btn btn--sm" onClick={onBack}>← Товары</button>
          </div>
        </div>
      </header>
      <main className="main">
        <div className="container">
          <div className="toolbar">
            <h1 className="title">Пользователи</h1>
          </div>
          {loading ? (
            <div className="empty">Загрузка...</div>
          ) : users.length === 0 ? (
            <div className="empty">Пользователей нет</div>
          ) : (
            <div className="list">
              {users.map((u) => (
                <div key={u.id} className="productRow">
                  <div className="productMain">
                    <div className="productId">#{u.id}</div>
                    <div className="productName">{u.first_name} {u.last_name}</div>
                    <div className="productCategory">{u.email}</div>
                    <RoleBadge role={u.role} />
                    {u.blocked && <span className="blockedBadge">Заблокирован</span>}
                  </div>
                  <div className="productActions">
                    <button className="btn btn--sm" onClick={() => setEditUser(u)} disabled={u.blocked}>Ред.</button>
                    <button className="btn btn--sm btn--danger" onClick={() => handleBlock(u.id)} disabled={u.blocked}>Блок.</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <UserEditModal open={!!editUser} user={editUser} onClose={() => setEditUser(null)} onSubmit={handleEditSubmit} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ========== Страница авторизации (Практика 7: email + first_name + last_name) ==========
function AuthPage({ onAuth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  // Практика 11: при регистрации можно выбрать роль (для демонстрации RBAC)
  const [role, setRole] = useState("user");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) { setError("Введите email и пароль"); return; }
    if (!isLogin && (!firstName.trim() || !lastName.trim())) { setError("Введите имя и фамилию"); return; }

    setLoading(true);
    try {
      if (isLogin) {
        const data = await api.login(email.trim(), password);
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        onAuth();
      } else {
        await api.register(email.trim(), password, firstName.trim(), lastName.trim(), role);
        const data = await api.login(email.trim(), password);
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        onAuth();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Ошибка сервера");
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
            Email
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ivan@example.com" autoFocus />
          </label>
          {/* Практика 7: поля имя и фамилия при регистрации */}
          {!isLogin && (
            <>
              <label className="label">
                Имя
                <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Иван" />
              </label>
              <label className="label">
                Фамилия
                <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Петров" />
              </label>
              {/* Практика 11: выбор роли при регистрации */}
              <label className="label">
                Роль
                <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="user">Пользователь</option>
                  <option value="seller">Продавец</option>
                  <option value="admin">Администратор</option>
                </select>
              </label>
            </>
          )}
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
function ProductsPage({ currentUser, onLogout, onUsersPage }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingProduct, setEditingProduct] = useState(null);
  const [toast, setToast] = useState(null);

  const role = currentUser?.role || getRoleFromToken();
  const canCreate = role === "seller" || role === "admin";

  const showToast = (message, type = "success") => setToast({ message, type });

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getProducts();
      setProducts(data);
    } catch {
      showToast("Ошибка загрузки товаров", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const openCreate = () => { setModalMode("create"); setEditingProduct(null); setModalOpen(true); };
  const openEdit = (product) => { setModalMode("edit"); setEditingProduct(product); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditingProduct(null); };

  const handleDelete = async (id) => {
    if (!window.confirm("Удалить товар?")) return;
    try {
      await api.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      showToast("Товар удалён");
    } catch (err) {
      const msg = err.response?.data?.error || "Ошибка удаления";
      showToast(msg, "error");
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
      const msg = err.response?.data?.error || "Ошибка сохранения";
      showToast(msg, "error");
    }
  };

  return (
    <div className="page">
      <header className="header">
        <div className="header__inner">
          <div className="brand">Digital Store</div>
          <div className="header__right">
            <div className="userInfo">
              {/* Практика 7: показываем имя; Практика 11: показываем роль */}
              <span className="username">
                {currentUser?.first_name ? `${currentUser.first_name} ${currentUser.last_name}` : currentUser?.email}
              </span>
              {role && <RoleBadge role={role} />}
            </div>
            {/* Практика 11: кнопка панели пользователей только для admin */}
            {role === "admin" && (
              <button className="btn btn--sm btn--warn" onClick={onUsersPage}>Пользователи</button>
            )}
            <button className="btn btn--sm btn--danger" onClick={onLogout}>Выйти</button>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="container">
          <div className="toolbar">
            <h1 className="title">Товары</h1>
            <div className="toolbar-actions">
              {/* Практика 11: кнопка создания только для seller и admin */}
              {canCreate && (
                <button className="btn btn--primary" onClick={openCreate}>+ Добавить товар</button>
              )}
            </div>
          </div>
          {loading ? (
            <div className="empty">Загрузка...</div>
          ) : (
            <ProductList products={products} onEdit={openEdit} onDelete={handleDelete} role={role} />
          )}
        </div>
      </main>

      <footer className="footer">
        <div className="footer__inner">© {new Date().getFullYear()} Digital Store — Практические занятия, Фронтенд и бэкенд разработка</div>
      </footer>

      <ProductModal open={modalOpen} mode={modalMode} initialProduct={editingProduct} onClose={closeModal} onSubmit={handleSubmitModal} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ========== Корневой компонент ==========
function App() {
  const [authed, setAuthed] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [page, setPage] = useState("products"); // "products" | "users"

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) { setChecking(false); return; }
    try {
      const user = await api.me();
      setCurrentUser(user);
      setAuthed(true);
    } catch {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const handleAuth = () => { checkAuth(); };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setAuthed(false);
    setCurrentUser(null);
    setPage("products");
  };

  if (checking) {
    return <div className="authPage"><div className="empty">Загрузка...</div></div>;
  }

  if (!authed) return <AuthPage onAuth={handleAuth} />;

  if (page === "users") {
    return <UsersPage onBack={() => setPage("products")} />;
  }

  return (
    <ProductsPage
      currentUser={currentUser}
      onLogout={handleLogout}
      onUsersPage={() => setPage("users")}
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(App));
