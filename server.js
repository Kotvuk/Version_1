const express = require('express');
const path = require('path');
const { 
  registerUser, 
  loginUser, 
  getDashboardStats, 
  getProfitChartData,
  createDemoAccounts,
  getDemoAccounts,
  getDemoAccountStats,
  getDemoAccountTrades
} = require('./database');
const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API: Вход
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email и пароль обязательны' });
  }
  
  loginUser(email, password, (err, user) => {
    if (err) {
      return res.status(401).json({ error: err.message });
    }
    
    res.json({ 
      success: true,
      message: 'Вход выполнен успешно',
      user: { id: user.id, name: user.name, email: user.email }
    });
  });
});

// API: Регистрация
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
  }
  
  registerUser(name, email, password, (err, user) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    
    res.json({ 
      success: true,
      message: 'Регистрация выполнена успешно',
      user: { id: user.id, name: user.name, email: user.email }
    });
  });
});

// API: Получение статистики для дашборда
app.get('/api/dashboard/stats', (req, res) => {
  const userId = req.query.userId;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID обязателен' });
  }
  
  getDashboardStats(userId, (err, stats) => {
    if (err) {
      return res.status(500).json({ error: 'Ошибка получения статистики' });
    }
    
    res.json({ success: true, stats });
  });
});

// API: Получение данных для графика профита
app.get('/api/dashboard/profit-chart', (req, res) => {
  const userId = req.query.userId;
  const days = req.query.days || 7;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID обязателен' });
  }
  
  getProfitChartData(userId, days, (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Ошибка получения данных графика' });
    }
    
    res.json({ success: true, data });
  });
});

// API: Получение демо-счетов пользователя
app.get('/api/demo-accounts', (req, res) => {
  const userId = req.query.userId;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID обязателен' });
  }
  
  getDemoAccounts(userId, (err, accounts) => {
    if (err) {
      return res.status(500).json({ error: 'Ошибка получения счетов' });
    }
    
    // Если счетов нет, создаём их
    if (accounts.length === 0) {
      createDemoAccounts(userId, (err) => {
        if (err) {
          return res.status(500).json({ error: 'Ошибка создания счетов' });
        }
        
        getDemoAccounts(userId, (err, newAccounts) => {
          if (err) {
            return res.status(500).json({ error: 'Ошибка получения счетов' });
          }
          res.json({ success: true, accounts: newAccounts });
        });
      });
    } else {
      res.json({ success: true, accounts });
    }
  });
});

// API: Получение статистики демо-счёта
app.get('/api/demo-accounts/:accountId/stats', (req, res) => {
  const accountId = req.params.accountId;
  
  getDemoAccountStats(accountId, (err, stats) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, stats });
  });
});

// API: Получение сделок демо-счёта
app.get('/api/demo-accounts/:accountId/trades', (req, res) => {
  const accountId = req.params.accountId;
  
  getDemoAccountTrades(accountId, (err, trades) => {
    if (err) {
      return res.status(500).json({ error: 'Ошибка получения сделок' });
    }
    res.json({ success: true, trades });
  });
});

app.listen(PORT, () => {
  console.log(`🚀 KotvukAI запущен на http://localhost:${PORT}`);
  console.log(`📊 Система авторизации готова`);
});
