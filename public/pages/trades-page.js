// ===================================
// ПАНЕЛЬ: СПИСОК СДЕЛОК
// ===================================

// Текущий выбранный демо-счёт
let currentDemoAccountId = null;

// Контент страницы "Список сделок"
function getTradesContent() {
  return `
    <div class="trades-header">
      <div class="account-switcher" id="accountSwitcher">
        <!-- Кнопки переключения счетов загружаются динамически -->
      </div>
    </div>

    <div class="account-stats-card" id="accountStatsCard">
      <!-- Статистика счёта загружается динамически -->
    </div>

    <div class="trades-card">
      <div class="trades-card-header">
        <h3>Список сделок</h3>
      </div>
      <div class="trades-table-container">
        <table class="trades-table" id="tradesTable">
          <thead>
            <tr>
              <th>ID</th>
              <th>Символ</th>
              <th>Тип</th>
              <th>Количество</th>
              <th>Вход</th>
              <th>Выход</th>
              <th>Профит</th>
              <th>Статус</th>
              <th>Дата</th>
            </tr>
          </thead>
          <tbody id="tradesTableBody">
            <tr>
              <td colspan="9" class="empty-state">Загрузка...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// Загрузка страницы сделок
async function loadTradesPage() {
  try {
    const userJson = localStorage.getItem('user');
    if (!userJson) return;
    
    const user = JSON.parse(userJson);
    const response = await fetch(`/api/demo-accounts?userId=${user.id}`);
    const data = await response.json();
    
    if (data.success && data.accounts.length > 0) {
      renderAccountSwitcher(data.accounts);
      currentDemoAccountId = data.accounts[0].id;
      loadAccountData(currentDemoAccountId);
    }
  } catch (error) {
    console.error('Ошибка загрузки счетов:', error);
  }
}

// Рендер переключателя счетов
function renderAccountSwitcher(accounts) {
  const switcher = document.getElementById('accountSwitcher');
  if (!switcher) return;
  
  switcher.innerHTML = accounts.map((account, index) => `
    <button class="account-btn ${index === 0 ? 'active' : ''}" data-account-id="${account.id}">
      <div class="account-btn-icon ${account.account_type}">
        ${account.account_type === 'user' ? '👤' : '🤖'}
      </div>
      <div class="account-btn-info">
        <p class="account-btn-name">${account.name}</p>
        <p class="account-btn-type">${account.account_type === 'user' ? 'Пользовательский' : 'ИИ'}</p>
      </div>
    </button>
  `).join('');
  
  // Обработка кликов
  document.querySelectorAll('.account-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.account-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const accountId = btn.getAttribute('data-account-id');
      currentDemoAccountId = accountId;
      loadAccountData(accountId);
    });
  });
}

// Загрузка данных счёта
async function loadAccountData(accountId) {
  try {
    // Загрузка статистики
    const statsResponse = await fetch(`/api/demo-accounts/${accountId}/stats`);
    const statsData = await statsResponse.json();
    
    if (statsData.success) {
      renderAccountStats(statsData.stats);
    }
    
    // Загрузка сделок
    const tradesResponse = await fetch(`/api/demo-accounts/${accountId}/trades`);
    const tradesData = await tradesResponse.json();
    
    if (tradesData.success) {
      renderTradesTable(tradesData.trades);
    }
  } catch (error) {
    console.error('Ошибка загрузки данных счёта:', error);
  }
}

// Рендер статистики счёта
function renderAccountStats(stats) {
  const statsCard = document.getElementById('accountStatsCard');
  if (!statsCard) return;
  
  const account = stats.account;
  const profitPercent = ((account.balance - account.initial_balance) / account.initial_balance * 100).toFixed(2);
  const profitAmount = (account.balance - account.initial_balance).toFixed(2);
  
  statsCard.innerHTML = `
    <div class="account-stat">
      <p class="account-stat-label">Текущий баланс</p>
      <p class="account-stat-value">$${account.balance.toFixed(2)}</p>
    </div>
    <div class="account-stat">
      <p class="account-stat-label">Начальный баланс</p>
      <p class="account-stat-value secondary">$${account.initial_balance.toFixed(2)}</p>
    </div>
    <div class="account-stat">
      <p class="account-stat-label">Профит/убыток</p>
      <p class="account-stat-value ${profitAmount >= 0 ? 'profit' : 'loss'}">
        ${profitAmount >= 0 ? '+' : ''}$${profitAmount} (${profitAmount >= 0 ? '+' : ''}${profitPercent}%)
      </p>
    </div>
    <div class="account-stat">
      <p class="account-stat-label">Всего сделок</p>
      <p class="account-stat-value">${stats.totalTrades}</p>
    </div>
    <div class="account-stat">
      <p class="account-stat-label">Активных сделок</p>
      <p class="account-stat-value">${stats.activeTrades}</p>
    </div>
  `;
}

// Рендер таблицы сделок
function renderTradesTable(trades) {
  const tbody = document.getElementById('tradesTableBody');
  if (!tbody) return;
  
  if (trades.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty-state">Нет сделок</td></tr>';
    return;
  }
  
  tbody.innerHTML = trades.map(trade => {
    const profit = trade.profit || 0;
    const profitClass = profit > 0 ? 'profit' : profit < 0 ? 'loss' : '';
    const statusClass = trade.status === 'open' ? 'status-open' : 'status-closed';
    
    return `
      <tr>
        <td>#${trade.id}</td>
        <td><strong>${trade.symbol}</strong></td>
        <td><span class="trade-type ${trade.type}">${trade.type === 'buy' ? 'LONG' : 'SHORT'}</span></td>
        <td>${trade.amount}</td>
        <td>$${trade.entry_price.toFixed(2)}</td>
        <td>${trade.exit_price ? '$' + trade.exit_price.toFixed(2) : '—'}</td>
        <td class="${profitClass}">${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}</td>
        <td><span class="trade-status ${statusClass}">${trade.status === 'open' ? 'Открыта' : 'Закрыта'}</span></td>
        <td>${new Date(trade.created_at).toLocaleDateString('ru-RU')}</td>
      </tr>
    `;
  }).join('');
}
