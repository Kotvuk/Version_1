// ===================================
// ГЛАВНЫЙ ФАЙЛ ПРИЛОЖЕНИЯ
// ===================================

// Текущая страница
let currentPage = 'dashboard';

// Проверка авторизации при загрузке
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  loadUserInfo();
  loadPage('dashboard');
  setupNavigation();
});

// Проверка авторизации
function checkAuth() {
  const user = localStorage.getItem('user');
  
  if (!user) {
    // Если пользователь не авторизован, перенаправляем на страницу входа
    window.location.href = '/';
  }
}

// Загрузка информации о пользователе
function loadUserInfo() {
  const userJson = localStorage.getItem('user');
  
  if (userJson) {
    const user = JSON.parse(userJson);
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userEmail').textContent = user.email;
  }
}

// Переключение состояния sidebar
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  
  sidebar.classList.toggle('active');
  overlay.classList.toggle('active');
  
  // Предотвращаем прокрутку body когда sidebar открыт
  if (sidebar.classList.contains('active')) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}

// Выход из системы
function handleLogout() {
  if (confirm('Вы уверены, что хотите выйти?')) {
    localStorage.removeItem('user');
    window.location.href = '/';
  }
}

// Настройка навигации
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.getAttribute('data-page');
      
      // Обновление активного пункта меню
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      
      // Загрузка страницы
      loadPage(page);
      
      // Закрытие sidebar на мобильных
      if (window.innerWidth <= 768) {
        toggleSidebar();
      }
    });
  });
}

// Загрузка контента страницы
function loadPage(page) {
  currentPage = page;
  const contentArea = document.getElementById('contentArea');
  const pageTitle = document.querySelector('.page-title');
  
  // Обновление заголовка
  const pageTitles = {
    dashboard: 'Дашборд',
    chart: 'График',
    trades: 'Список сделок',
    ai: 'ИИ Анализ',
    settings: 'Настройки'
  };
  pageTitle.textContent = pageTitles[page] || 'KotvukAI';
  
  // Загрузка контента
  switch(page) {
    case 'dashboard':
      contentArea.innerHTML = getDashboardContent();
      break;
    case 'trades':
      contentArea.innerHTML = getTradesContent();
      loadTradesPage();
      break;
    case 'chart':
    case 'ai':
    case 'settings':
      contentArea.innerHTML = getUnderDevelopmentContent(pageTitles[page]);
      break;
    default:
      contentArea.innerHTML = getDashboardContent();
  }
}

// Закрытие sidebar при нажатии ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar.classList.contains('active')) {
      sidebar.classList.remove('active');
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }
});
