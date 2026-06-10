import express from 'express';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import db, { initDb } from './db.js';
import { 
  generateDeliveryTasks, 
  isFastingDay,
  parseDateString,
  formatDateString
} from './src/utils/calendar.js';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cookieParser());

const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'oz-kitchen-secret-2026';

// ----------------------------------------------------
// NOTIFICATION SERVICE
// ----------------------------------------------------
class NotificationService {
  static async notify(userId: string | null, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', surface: 'admin' | 'telegram' | 'driver' = 'admin') {
    const res = await db.query(
      'INSERT INTO notifications (user_id, title, message, type, surface) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, title, message, type, surface]
    );
    // In a real app, we might emit a Socket.io event here
    console.log(`[Notification] ${surface.toUpperCase()} -> ${title}: ${message}`);
    return res.rows[0];
  }

  static async getForUser(userId: string, surface: string) {
    const res = await db.query(
      'SELECT * FROM notifications WHERE (user_id = $1 OR user_id IS NULL) AND surface = $2 ORDER BY created_at DESC LIMIT 20',
      [userId, surface]
    );
    return res.rows;
  }
}

// ----------------------------------------------------
// AUTH MIDDLEWARE
// ----------------------------------------------------
const authenticate = (roles: string[] = []) => {
  return (req: any, res: any, next: any) => {
    const token = req.cookies.auth_token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      if (process.env.NODE_ENV !== 'production' && req.headers['x-dev-bypass']) {
        req.user = { id: 'dev-admin', role: 'admin' };
        return next();
      }
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded;
      
      if (roles.length > 0 && !roles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
};

// TELEGRAM MOCK AUTH
const validateTelegramAuth = (req: any, res: any, next: any) => {
  const initData = req.headers['x-telegram-init-data'];
  if (!initData && process.env.NODE_ENV !== 'production') {
    // Development bypass
    if (req.body.bypass && req.body.mockUserId) {
      req.tgUser = { id: String(req.body.mockUserId) };
      return next();
    }
  }

  // Proper validation logic (MOCKED for demo)
  // In real life, we would check crypto.createHmac('sha256', ...)
  if (initData) {
    try {
      const data = JSON.parse(decodeURIComponent(initData));
      req.tgUser = data.user;
      return next();
    } catch (e) {
      return res.status(401).json({ error: 'Invalid Telegram data' });
    }
  }

  res.status(401).json({ error: 'Telegram authentication required' });
};

// ----------------------------------------------------
// BUSINESS LOGIC WRAPPERS
// ----------------------------------------------------
async function refreshAllTasks() {
  const subscriptionsRes = await db.query('SELECT * FROM subscriptions');
  const subscriptions = subscriptionsRes.rows;
  
  const exceptionsRes = await db.query('SELECT * FROM calendar_exceptions');
  const allExceptions = exceptionsRes.rows;
  
  const kitchenRes = await db.query('SELECT * FROM kitchen WHERE id = 1');
  const kitchen = kitchenRes.rows[0];
  if (!kitchen) return;
  const operatingDays = JSON.parse(kitchen.operating_days);

  await db.query("DELETE FROM calendar_exceptions WHERE type = 'compensation'");
  await db.query("DELETE FROM delivery_tasks");

  for (const sub of subscriptions) {
    const selectionsRes = await db.query('SELECT * FROM meal_selections WHERE subscription_id = $1', [sub.id]);
    const subSelections = selectionsRes.rows;
    
    const { tasks, sideEffectExceptions } = generateDeliveryTasks(
      sub as any,
      subSelections as any,
      allExceptions as any,
      operatingDays,
      kitchen.pickup_address,
      sub.delivery_address || "Customer Address"
    );

    for (const task of tasks) {
      await db.query(`
        INSERT INTO delivery_tasks (id, date, subscription_id, meal_selection_id, pickup_address, delivery_address, status, is_compensation, compensation_reason)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        task.id, task.date, task.subscription_id, task.meal_selection_id,
        task.pickup_address, task.delivery_address, task.status,
        task.is_compensation ? true : false, task.compensation_reason
      ]);
    }

    for (const ex of sideEffectExceptions) {
      await db.query(`
        INSERT INTO calendar_exceptions (id, date, type, reason, linked_exception_id, subscription_id)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [ex.id, ex.date, ex.type, ex.reason, ex.linked_exception_id, ex.subscription_id]);
    }
  }
}

async function emitDomainEvent(type: string, payload: any) {
  const id = `ev_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  await db.query('INSERT INTO domain_events (id, type, payload, created_at) VALUES ($1, $2, $3, $4)', [
    id, type, JSON.stringify(payload), new Date().toISOString()
  ]);
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// AUTH
app.post('/api/auth/login', async (req, res) => {
  const { phone, password } = req.body;
  const userRes = await db.query('SELECT * FROM users WHERE phone = $1', [phone]);
  const user = userRes.rows[0];
  if (!user) return res.status(401).json({ error: 'User not found' });
  
  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
  res.cookie('auth_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
  res.json({ success: true, user: { id: user.id, role: user.role, name: user.name } });
});

app.post('/api/auth/telegram', validateTelegramAuth, async (req: any, res) => {
  const tgId = String(req.tgUser.id);
  const userRes = await db.query('SELECT * FROM users WHERE telegram_user_id = $1 OR id = $1', [tgId]);
  let user = userRes.rows[0];

  if (!user) {
    // For demo, if user not found, we create a customer profile or link it
    // In real app, we would ask them to link their phone
    user = { id: tgId, role: 'customer', name: req.tgUser.first_name || 'TG User', telegram_user_id: tgId };
    await db.query('INSERT INTO users (id, role, name, telegram_user_id) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING', [user.id, user.role, user.name, user.telegram_user_id]);
  }

  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
  res.cookie('auth_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
  res.json({ success: true, user: { id: user.id, role: user.role, name: user.name } });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ success: true });
});

// KITCHEN
app.get('/api/kitchen', async (req, res) => {
  const kitchenRes = await db.query('SELECT * FROM kitchen WHERE id = 1');
  const kitchen = kitchenRes.rows[0];
  if (kitchen) kitchen.operating_days = JSON.parse(kitchen.operating_days);
  res.json(kitchen);
});

app.post('/api/kitchen', authenticate(['admin']), async (req, res) => {
  const { name, operating_days, pickup_address, contact_phone } = req.body;
  await db.query(`
    UPDATE kitchen SET 
      name = COALESCE($1, name),
      operating_days = COALESCE($2, operating_days),
      pickup_address = COALESCE($3, pickup_address),
      contact_phone = COALESCE($4, contact_phone)
    WHERE id = 1
  `, [name, operating_days ? JSON.stringify(operating_days) : null, pickup_address, contact_phone]);
  
  await refreshAllTasks();
  await emitDomainEvent('KitchenUpdated', req.body);
  await NotificationService.notify(null, 'Kitchen Updated', 'Operational settings have been synchronized.', 'info', 'admin');
  res.json({ success: true });
});

// USERS
app.get('/api/users', authenticate(['admin']), async (req, res) => {
  const usersRes = await db.query('SELECT id, role, phone, name, address, telegram_user_id FROM users');
  res.json(usersRes.rows);
});

// MEALS
app.get('/api/meals', async (req, res) => {
  const mealsRes = await db.query('SELECT * FROM meals');
  res.json(mealsRes.rows);
});

// MENU
app.get('/api/menu', async (req, res) => {
  const menuRes = await db.query('SELECT * FROM menus LIMIT 1');
  const menu = menuRes.rows[0];
  if (!menu) return res.json(null);
  
  const mealsRes = await db.query(`
    SELECT m.* FROM meals m
    JOIN menu_meals mm ON m.id = mm.meal_id
    WHERE mm.menu_id = $1
  `, [menu.id]);
  
  res.json({ ...menu, meals: mealsRes.rows });
});

// SUBSCRIPTIONS
app.get('/api/subscriptions', authenticate(['admin', 'customer']), async (req: any, res) => {
  let query = `
    SELECT s.*, u.name as customer_name, u.phone as customer_phone
    FROM subscriptions s
    LEFT JOIN users u ON s.customer_id = u.id
  `;
  const params = [];

  if (req.user.role === 'customer') {
    query += ' WHERE s.customer_id = $1';
    params.push(req.user.id);
  }

  const subsRes = await db.query(query, params);
  const subs = subsRes.rows;
  
  for (const sub of subs) {
    const tasksRes = await db.query('SELECT * FROM delivery_tasks WHERE subscription_id = $1', [sub.id]);
    sub.tasks = tasksRes.rows;
  }
  
  res.json(subs);
});

app.post('/api/subscriptions', authenticate(['admin', 'customer']), async (req: any, res) => {
  const { customer_id, type, combo_preference, start_date, end_date, delivery_address } = req.body;
  const id = `sub_${Date.now()}`;
  const kitchenRes = await db.query('SELECT * FROM kitchen WHERE id = 1');
  const kitchen = kitchenRes.rows[0];
  
  await db.query(`
    INSERT INTO subscriptions (id, customer_id, type, combo_preference, start_date, end_date, payment_status, delivery_address, pickup_address)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `, [
    id, customer_id || req.user.id, type, combo_preference, start_date, end_date, 'unpaid', delivery_address, kitchen.pickup_address
  ]);

  const menuRes = await db.query('SELECT id FROM menus LIMIT 1');
  const menuId = menuRes.rows[0]?.id;
  const menuMealsRes = await db.query('SELECT m.* FROM meals m JOIN menu_meals mm ON m.id = mm.meal_id WHERE mm.menu_id = $1', [menuId]);
  const menuMeals = menuMealsRes.rows;
  
  const exceptionsRes = await db.query('SELECT * FROM calendar_exceptions');
  const exceptions = exceptionsRes.rows;
  const operatingDays = JSON.parse(kitchen.operating_days);

  let subMeals = menuMeals.filter(m => {
    if (type === 'fasting') return m.type === 'fasting';
    if (type === 'non_fasting') return m.type === 'non_fasting';
    return true;
  });

  const start = parseDateString(start_date);
  const end = parseDateString(end_date);
  const current = new Date(start);
  
  const fastingMeals = subMeals.filter(m => m.type === 'fasting');
  const nonFastingMeals = subMeals.filter(m => m.type === 'non_fasting');
  let fIdx = 0, nfIdx = 0;

  while (current <= end) {
    const dayOfWeek = current.getDay();
    const dateStr = formatDateString(current);
    if (operatingDays.includes(dayOfWeek)) {
      const fasting = isFastingDay(dateStr, type, exceptions);
      const meal = fasting 
        ? (fastingMeals.length > 0 ? fastingMeals[fIdx++ % fastingMeals.length] : subMeals[0])
        : (nonFastingMeals.length > 0 ? nonFastingMeals[nfIdx++ % nonFastingMeals.length] : subMeals[0]);

      await db.query('INSERT INTO meal_selections (id, subscription_id, date, meal_id) VALUES ($1, $2, $3, $4)', [
        `sel_${id}_${dateStr}`, id, dateStr, meal.id
      ]);
    }
    current.setDate(current.getDate() + 1);
  }
  
  await refreshAllTasks();
  await emitDomainEvent('SubscriptionCreated', { id, customer_id: customer_id || req.user.id });
  await NotificationService.notify(null, 'New Subscription', `Customer ${customer_id || req.user.id} created a ${type} plan.`, 'success', 'admin');
  res.status(201).json({ id });
});

// TELEBIRR MOCK
app.post('/api/subscriptions/:id/pay', authenticate(['customer']), async (req, res) => {
  const { amount, telebirr_ref, screenshot_url } = req.body;
  const subId = req.params.id;
  
  await db.query(`
    INSERT INTO payment_records (id, subscription_id, amount, telebirr_ref, screenshot_url, recorded_at)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [`pay_${Date.now()}`, subId, amount, telebirr_ref, screenshot_url, new Date().toISOString()]);

  await db.query('UPDATE subscriptions SET payment_status = $1 WHERE id = $2', ['verifying', subId]);
  
  await NotificationService.notify(null, 'Payment Receipt Uploaded', `New payment verification req for sub ${subId} (Ref: ${telebirr_ref})`, 'warning', 'admin');
  res.json({ success: true });
});

app.post('/api/subscriptions/:id/approve-payment', authenticate(['admin']), async (req, res) => {
  const subId = req.params.id;
  await db.query('UPDATE subscriptions SET payment_status = $1 WHERE id = $2', ['paid', subId]);
  
  const subRes = await db.query('SELECT customer_id FROM subscriptions WHERE id = $1', [subId]);
  const customerId = subRes.rows[0]?.customer_id;
  
  await NotificationService.notify(customerId, 'Subscription Activated', 'Your Telebirr payment has been verified. Welcome to Oz Kitchen!', 'success', 'telegram');
  res.json({ success: true });
});

// DELIVERY TASKS
app.get('/api/delivery-tasks', authenticate(['admin', 'driver']), async (req, res) => {
  const { date } = req.query;
  const targetDate = typeof date === 'string' ? date : formatDateString(new Date());
  
  const tasksRes = await db.query(`
    SELECT t.*, u.name as customer_name, u.phone as customer_phone, m.name as meal_name, m.type as meal_type, s.combo_preference
    FROM delivery_tasks t
    JOIN subscriptions s ON t.subscription_id = s.id
    JOIN users u ON s.customer_id = u.id
    JOIN meal_selections ms ON t.meal_selection_id = ms.id
    JOIN meals m ON ms.meal_id = m.id
    WHERE t.date = $1
  `, [targetDate]);

  res.json(tasksRes.rows);
});

app.put('/api/delivery-tasks/:id/status', authenticate(['admin', 'driver']), async (req, res) => {
  const { status, failure_reason } = req.body;
  await db.query('UPDATE delivery_tasks SET status = $1, failure_reason = $2 WHERE id = $3', [
    status, failure_reason || null, req.params.id
  ]);
  
  const taskRes = await db.query('SELECT subscription_id FROM delivery_tasks WHERE id = $1', [req.params.id]);
  const subId = taskRes.rows[0]?.subscription_id;
  const subRes = await db.query('SELECT customer_id FROM subscriptions WHERE id = $1', [subId]);
  const customerId = subRes.rows[0]?.customer_id;

  if (status === 'delivered') {
    await NotificationService.notify(customerId, 'Lunch Delivered!', 'Enjoy your Oz Kitchen meal. Bon appétit!', 'success', 'telegram');
  } else if (status === 'failed') {
    await NotificationService.notify(customerId, 'Delivery Failed', `Sorry, we couldn't deliver your meal: ${failure_reason}`, 'error', 'telegram');
  }

  await emitDomainEvent('DeliveryStatusUpdated', { id: req.params.id, status });
  res.json({ success: true });
});

// DRIVER GPS
app.post('/api/driver/location', authenticate(['driver']), async (req: any, res) => {
  const { latitude, longitude } = req.body;
  await db.query(`
    INSERT INTO driver_locations (driver_id, latitude, longitude, updated_at)
    VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    ON CONFLICT (driver_id) DO UPDATE SET
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      updated_at = EXCLUDED.updated_at
  `, [req.user.id, latitude, longitude]);
  res.json({ success: true });
});

app.get('/api/driver/locations', authenticate(['admin']), async (req, res) => {
  const locationsRes = await db.query(`
    SELECT dl.*, u.name as driver_name 
    FROM driver_locations dl
    JOIN users u ON dl.driver_id = u.id
  `);
  res.json(locationsRes.rows);
});

// NOTIFICATIONS
app.get('/api/notifications', authenticate(['admin', 'customer', 'driver']), async (req: any, res) => {
  const { surface } = req.query;
  const notifications = await NotificationService.getForUser(req.user.id, surface as string || 'admin');
  res.json(notifications);
});

app.post('/api/notifications/:id/read', authenticate(), async (req, res) => {
  await db.query('UPDATE notifications SET is_read = TRUE WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

// EXCEPTIONS
app.get('/api/exceptions', async (req, res) => {
  const exceptionsRes = await db.query('SELECT * FROM calendar_exceptions');
  res.json(exceptionsRes.rows);
});

app.post('/api/exceptions', authenticate(['admin']), async (req, res) => {
  const { date, type, reason } = req.body;
  const id = `ex_${Date.now()}`;
  await db.query('INSERT INTO calendar_exceptions (id, date, type, reason) VALUES ($1, $2, $3, $4)', [
    id, date, type, reason
  ]);
  await refreshAllTasks();
  await emitDomainEvent('ExceptionAdded', { id, type, date });
  res.status(201).json({ id });
});

app.get('/api/events', authenticate(['admin']), async (req, res) => {
  const eventsRes = await db.query('SELECT * FROM domain_events ORDER BY created_at DESC');
  const events = eventsRes.rows;
  events.forEach(e => e.payload = JSON.parse(e.payload));
  res.json(events);
});

async function startServer() {
  await initDb();
  
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Oz Kitchen Server on http://0.0.0.0:${PORT}`);
  });
}

startServer();
