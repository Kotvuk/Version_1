const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Создание и подключение к базе данных
const db = new sqlite3.Database(path.join(__dirname, 'kotvukai.db'), (err) => {
  if (err) {
    console.error('❌ Ошибка подключения к БД:', err);
  } else {
    console.log('✅ Подключено к SQLite базе данных');
  }
});

// Создание таблиц
db.serialize(() => {
  // Таблица пользователей
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('❌ Ошибка создания таблицы users:', err);
    } else {
      console.log('✅ Таблица users готова');
      createAdminUser();
    }
  });

  // Таблица демо-счетов
  db.run(`
    CREATE TABLE IF NOT EXISTS demo_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      account_type TEXT NOT NULL,
      balance REAL DEFAULT 10000,
      initial_balance REAL DEFAULT 10000,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('❌ Ошибка создания таблицы demo_accounts:', err);
    } else {
      console.log('✅ Таблица demo_accounts готова');
    }
  });

  // Таблица графиков
  db.run(`
    CREATE TABLE IF NOT EXISTS charts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      timeframe TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('❌ Ошибка создания таблицы charts:', err);
    } else {
      console.log('✅ Таблица charts готова');
    }
  });

  // Таблица анализов
  db.run(`
    CREATE TABLE IF NOT EXISTS analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chart_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      prediction TEXT NOT NULL,
      confidence REAL,
      is_correct INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chart_id) REFERENCES charts(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('❌ Ошибка создания таблицы analyses:', err);
    } else {
      console.log('✅ Таблица analyses готова');
    }
  });

  // Таблица сделок
  db.run(`
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      demo_account_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      type TEXT NOT NULL,
      entry_price REAL NOT NULL,
      exit_price REAL,
      amount REAL NOT NULL,
      profit REAL DEFAULT 0,
      status TEXT DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME,
      FOREIGN KEY (demo_account_id) REFERENCES demo_accounts(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('❌ Ошибка создания таблицы trades:', err);
    } else {
      console.log('✅ Таблица trades готова');
    }
  });
});

// Создание администратора admin@corp.kz
async function createAdminUser() {
  const adminEmail = 'admin@corp.kz';
  const adminPassword = 'AdminDamir';
  const adminName = 'Administrator';
  
  db.get('SELECT * FROM users WHERE email = ?', [adminEmail], async (err, row) => {
    if (err) {
      console.error('❌ Ошибка проверки администратора:', err);
      return;
    }
    
    if (!row) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      db.run(
        'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
        [adminName, adminEmail, hashedPassword],
        (err) => {
          if (err) {
            console.error('❌ Ошибка создания администратора:', err);
          } else {
            console.log('✅ Администратор создан:', adminEmail);
          }
        }
      );
    } else {
      console.log('ℹ️  Администратор уже существует');
    }
  });
}

// Регистрация нового пользователя
function registerUser(name, email, password, callback) {
  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      return callback(err);
    }
    
    db.run(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return callback(new Error('Пользователь с таким email уже существует'));
          }
          return callback(err);
        }
        callback(null, { id: this.lastID, name, email });
      }
    );
  });
}

// Вход пользователя
function loginUser(email, password, callback) {
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) {
      return callback(err);
    }
    
    if (!user) {
      return callback(new Error('Неверный email или пароль'));
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return callback(new Error('Неверный email или пароль'));
    }
    
    callback(null, { id: user.id, name: user.name, email: user.email });
  });
}

// Получение статистики для дашборда
function getDashboardStats(userId, callback) {
  const stats = {};
  
  // Получение суммы балансов всех демо-счетов пользователя
  db.get('SELECT SUM(balance) as total_balance FROM demo_accounts WHERE user_id = ?', [userId], (err, row) => {
    if (err) return callback(err);
    stats.balance = row && row.total_balance ? row.total_balance : 0;
    
    // Подсчет нереализованного профита (открытые сделки только пользовательских счетов)
    db.get(`
      SELECT SUM(t.profit) as unrealized 
      FROM trades t 
      JOIN demo_accounts da ON t.demo_account_id = da.id 
      WHERE t.user_id = ? AND t.status = "open" AND da.account_type = "user"
    `, [userId], (err, row) => {
      if (err) return callback(err);
      stats.unrealizedProfit = row.unrealized || 0;
      
      // Подсчет активных сделок пользователя
      db.get(`
        SELECT COUNT(*) as count 
        FROM trades t 
        JOIN demo_accounts da ON t.demo_account_id = da.id 
        WHERE t.user_id = ? AND t.status = "open" AND da.account_type = "user"
      `, [userId], (err, row) => {
        if (err) return callback(err);
        stats.activeTrades = row.count;
        
        // Расчет точности ИИ анализа
        db.get('SELECT COUNT(*) as total FROM analyses WHERE user_id = ? AND is_correct IS NOT NULL', [userId], (err, row) => {
          if (err) return callback(err);
          const totalChecked = row.total;
          
          if (totalChecked === 0) {
            stats.aiAccuracy = 0;
            callback(null, stats);
            return;
          }
          
          db.get('SELECT COUNT(*) as correct FROM analyses WHERE user_id = ? AND is_correct = 1', [userId], (err, row) => {
            if (err) return callback(err);
            const correctPredictions = row.correct;
            stats.aiAccuracy = (correctPredictions / totalChecked) * 100;
            
            callback(null, stats);
          });
        });
      });
    });
  });
}

// Получение данных для графика профита
function getProfitChartData(userId, days, callback) {
  const query = `
    SELECT DATE(closed_at) as date, SUM(profit) as daily_profit
    FROM trades
    WHERE user_id = ? AND status = "closed" AND closed_at >= datetime('now', '-' || ? || ' days')
    GROUP BY DATE(closed_at)
    ORDER BY date ASC
  `;
  
  db.all(query, [userId, days], (err, rows) => {
    if (err) return callback(err);
    callback(null, rows);
  });
}

// Создание демо-счетов для пользователя
function createDemoAccounts(userId, callback) {
  // Создание пользовательского счёта
  db.run(
    'INSERT INTO demo_accounts (user_id, name, account_type, balance, initial_balance) VALUES (?, ?, ?, ?, ?)',
    [userId, 'Мой демо-счёт', 'user', 10000, 10000],
    function(err) {
      if (err) return callback(err);
      
      // Создание ИИ счёта
      db.run(
        'INSERT INTO demo_accounts (user_id, name, account_type, balance, initial_balance) VALUES (?, ?, ?, ?, ?)',
        [userId, 'ИИ демо-счёт', 'ai', 10000, 10000],
        function(err) {
          if (err) return callback(err);
          callback(null);
        }
      );
    }
  );
}

// Получение демо-счетов пользователя
function getDemoAccounts(userId, callback) {
  db.all('SELECT * FROM demo_accounts WHERE user_id = ? ORDER BY account_type', [userId], callback);
}

// Получение статистики демо-счёта
function getDemoAccountStats(accountId, callback) {
  const stats = {};
  
  db.get('SELECT * FROM demo_accounts WHERE id = ?', [accountId], (err, account) => {
    if (err) return callback(err);
    if (!account) return callback(new Error('Счёт не найден'));
    
    stats.account = account;
    
    // Подсчет сделок
    db.get('SELECT COUNT(*) as total, SUM(CASE WHEN status = "open" THEN 1 ELSE 0 END) as active FROM trades WHERE demo_account_id = ?', [accountId], (err, row) => {
      if (err) return callback(err);
      stats.totalTrades = row.total;
      stats.activeTrades = row.active;
      
      // Подсчет профита
      db.get('SELECT SUM(profit) as total_profit FROM trades WHERE demo_account_id = ? AND status = "closed"', [accountId], (err, row) => {
        if (err) return callback(err);
        stats.totalProfit = row.total_profit || 0;
        
        callback(null, stats);
      });
    });
  });
}

// Получение сделок демо-счёта
function getDemoAccountTrades(accountId, callback) {
  db.all(
    'SELECT * FROM trades WHERE demo_account_id = ? ORDER BY created_at DESC',
    [accountId],
    callback
  );
}

module.exports = {
  db,
  registerUser,
  loginUser,
  getDashboardStats,
  getProfitChartData,
  createDemoAccounts,
  getDemoAccounts,
  getDemoAccountStats,
  getDemoAccountTrades
};
