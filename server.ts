import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { 
  generateDeliveryTasks, 
  isFastingDay,
  parseDateString,
  formatDateString,
  Subscription, 
  MealSelection, 
  CalendarException, 
  DeliveryTask, 
  Meal, 
  Menu, 
  User, 
  PaymentRecord, 
  DomainEvent,
  Kitchen
} from './src/utils/calendar.js';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'data', 'db.json');

// Ensure database directory exists
if (!fs.existsSync(path.dirname(DB_FILE))) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
}

// ----------------------------------------------------
// DATABASE SYSTEM (RELATIONAL/FILE-BACKED PARADIGM)
// ----------------------------------------------------
interface Schema {
  kitchen: Kitchen;
  users: User[];
  meals: Meal[];
  menus: Menu[];
  subscriptions: Subscription[];
  meal_selections: MealSelection[];
  calendar_exceptions: CalendarException[];
  delivery_tasks: DeliveryTask[];
  payment_records: PaymentRecord[];
  domain_events: DomainEvent[];
}

const DEFAULT_DB: Schema = {
  kitchen: {
    id: 1,
    name: "Oz Kitchen Central",
    operating_days: [1, 2, 3, 4, 5], // Mon - Fri
    pickup_address: "Bole, Behind Edna Mall, Addis Ababa, Ethiopia",
    contact_phone: "+251 911 234567"
  },
  users: [
    { id: 1, role: 'admin', phone: '+251911111111', name: 'Almaz Tadesse (Manager)' },
    { id: 2, role: 'driver', phone: '+251922222222', name: 'Abebe Kebede (Lead Driver)' },
    { id: 3, role: 'customer', phone: '+251933333333', name: 'Deborah Mezmur (Tech Lead)', address: 'Wollo Sefer, Kasanchis Block, Floor 4' }
  ],
  meals: [
    // Fasting meals
    { id: 'm1', name: 'Shiro Wat with Injera', photo_url: 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?auto=format&fit=crop&q=80&w=400', type: 'fasting', is_combo: false },
    { id: 'm2', name: 'Misir Wat (Spicy Lentils)', photo_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=400', type: 'fasting', is_combo: false },
    { id: 'm3', name: 'Beyaynetu (Fasting Platter)', photo_url: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?auto=format&fit=crop&q=80&w=400', type: 'fasting', is_combo: true },
    { id: 'm4', name: 'Fasting Firfir', photo_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=400', type: 'fasting', is_combo: false },
    // Non-fasting meals
    { id: 'm5', name: 'Doro Wat (Chicken Stew)', photo_url: 'https://images.unsplash.com/photo-1604152135912-04a022e23696?auto=format&fit=crop&q=80&w=400', type: 'non_fasting', is_combo: true },
    { id: 'm6', name: 'Dereq Tibs with Injera', photo_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=400', type: 'non_fasting', is_combo: false },
    { id: 'm7', name: 'Beef Alicha Wat', photo_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=400', type: 'non_fasting', is_combo: false },
    { id: 'm8', name: 'Chef Special Meat Combo', photo_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=400', type: 'non_fasting', is_combo: true }
  ],
  menus: [
    {
      id: 1,
      valid_from: '2026-06-01',
      valid_to: '2026-06-30',
      meals: [
        { id: 'm1', name: 'Shiro Wat with Injera', photo_url: 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?auto=format&fit=crop&q=80&w=400', type: 'fasting', is_combo: false },
        { id: 'm2', name: 'Misir Wat (Spicy Lentils)', photo_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=400', type: 'fasting', is_combo: false },
        { id: 'm3', name: 'Beyaynetu (Fasting Platter)', photo_url: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?auto=format&fit=crop&q=80&w=400', type: 'fasting', is_combo: true },
        { id: 'm4', name: 'Fasting Firfir', photo_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=400', type: 'fasting', is_combo: false },
        { id: 'm5', name: 'Doro Wat (Chicken Stew)', photo_url: 'https://images.unsplash.com/photo-1604152135912-04a022e23696?auto=format&fit=crop&q=80&w=400', type: 'non_fasting', is_combo: true },
        { id: 'm6', name: 'Dereq Tibs with Injera', photo_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=400', type: 'non_fasting', is_combo: false },
        { id: 'm7', name: 'Beef Alicha Wat', photo_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=400', type: 'non_fasting', is_combo: false },
        { id: 'm8', name: 'Chef Special Meat Combo', photo_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=400', type: 'non_fasting', is_combo: true }
      ]
    }
  ],
  subscriptions: [
    {
      id: 'sub_active_1',
      customer_id: 3,
      type: 'hybrid',
      combo_preference: 'combo',
      start_date: '2026-06-08',
      end_date: '2026-06-19',
      payment_status: 'paid',
      delivery_address: 'Deborah Mezmur - Wollo Sefer, Floor 4',
      pickup_address: 'Bole, Behind Edna Mall, Addis Ababa, Ethiopia'
    }
  ],
  meal_selections: [
    { id: 'se_1', subscription_id: 'sub_active_1', date: '2026-06-08', meal_id: 'm5' }, // Mon, Hybrid -> non_fasting
    { id: 'se_2', subscription_id: 'sub_active_1', date: '2026-06-09', meal_id: 'm6' }, // Tue, Hybrid -> non_fasting
    { id: 'se_3', subscription_id: 'sub_active_1', date: '2026-06-10', meal_id: 'm3' }, // Wed, Hybrid -> fasting
    { id: 'se_4', subscription_id: 'sub_active_1', date: '2026-06-11', meal_id: 'm7' }, // Thu, Hybrid -> non_fasting
    { id: 'se_5', subscription_id: 'sub_active_1', date: '2026-06-12', meal_id: 'm1' }, // Fri, Hybrid -> fasting
    { id: 'se_6', subscription_id: 'sub_active_1', date: '2026-06-15', meal_id: 'm8' }, // Mon, Hybrid -> non_fasting
    { id: 'se_7', subscription_id: 'sub_active_1', date: '2026-06-16', meal_id: 'm6' }, // Tue, Hybrid -> non_fasting
    { id: 'se_8', subscription_id: 'sub_active_1', date: '2026-06-17', meal_id: 'm2' }, // Wed, Hybrid -> fasting
    { id: 'se_9', subscription_id: 'sub_active_1', date: '2026-06-18', meal_id: 'm5' }, // Thu, Hybrid -> non_fasting
    { id: 'se_10', subscription_id: 'sub_active_1', date: '2026-06-19', meal_id: 'm3' }  // Fri, Hybrid -> fasting
  ],
  calendar_exceptions: [
    { id: 'ex_1', date: '2026-06-12', type: 'holiday', reason: 'Abune Dekemios Day' } // This holiday skipped June 12 and extends subscription sub_active_1 to June 22
  ],
  delivery_tasks: [], // Generated below
  payment_records: [
    { id: 'pay_1', subscription_id: 'sub_active_1', amount: 3500, telebirr_ref: 'TXN93481239', recorded_at: '2026-06-08T09:00:00Z' }
  ],
  domain_events: [
    { id: 'ev_0', type: 'SubscriptionConfirmed', payload: { subscription_id: 'sub_active_1' }, created_at: '2026-06-08T09:10:00Z' }
  ]
};

// Seed delivery tasks on load
function dbLoad(): Schema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(data) as Schema;
    }
  } catch (err) {
    console.error("Failed to read DB file, defaulting", err);
  }
  return DEFAULT_DB;
}

function dbSave(data: Schema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error("Failed to write DB file", err);
  }
}

// Global active database state with lazy evaluation
let db = dbLoad();

// Recalculates all active subscriptions tasks & inserts database saves
function refreshAllTasks() {
  const resultTasks: DeliveryTask[] = [];
  const compExceptions: CalendarException[] = [];

  // Clear existing pending compensations that are derived
  db.calendar_exceptions = db.calendar_exceptions.filter(ex => ex.type !== 'compensation');

  for (const sub of db.subscriptions) {
    const subSelections = db.meal_selections.filter(sel => sel.subscription_id === sub.id);
    
    // Retrieve ALL exceptions except existing custom compensations
    const activeExceptions = db.calendar_exceptions;
    const { tasks: subTasks, sideEffectExceptions } = generateDeliveryTasks(
      sub,
      subSelections,
      activeExceptions,
      db.kitchen.operating_days,
      db.kitchen.pickup_address,
      sub.delivery_address || "Customer Address"
    );

    // Save generated sideEffect compensations
    compExceptions.push(...sideEffectExceptions);
    resultTasks.push(...subTasks);
  }

  // Push new compensations
  db.calendar_exceptions.push(...compExceptions);
  db.delivery_tasks = resultTasks;
  dbSave(db);
}

// Initial calculation
refreshAllTasks();

// Helper to log Domain Events
function emitDomainEvent(type: string, payload: any) {
  const newEv: DomainEvent = {
    id: `ev_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    type,
    payload,
    created_at: new Date().toISOString()
  };
  db.domain_events.push(newEv);
  dbSave(db);
  console.log(`[Event Logged]: ${type}`, payload);
}

// ----------------------------------------------------
// TELEGRAM HMAC VALIDATION
// ----------------------------------------------------
function verifyTelegramWebAppData(initData: string, botToken: string): { success: boolean; data?: any; error?: string } {
  try {
    if (!initData) {
      return { success: false, error: 'Authorization header is empty' };
    }
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) {
      return { success: false, error: 'Missing hash string' };
    }

    // Sort parameters
    params.delete('hash');
    const sortedKeys = Array.from(params.keys()).sort();
    const dataCheckString = sortedKeys
      .map(key => `${key}=${params.get(key)}`)
      .join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const expectedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (expectedHash !== hash) {
      return { success: false, error: 'Invalid HMAC signature' };
    }

    const authDate = Number(params.get('auth_date'));
    const now = Math.floor(Date.now() / 1000);
    // Allow generous 2-hour window since we are simulating clocks in a sandbox environment
    if (!authDate || Math.abs(now - authDate) > 7200) {
      return { success: false, error: 'Authentication data is outdated' };
    }

    const userJson = params.get('user');
    const user = userJson ? JSON.parse(userJson) : null;

    return { success: true, data: { user } };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ----------------------------------------------------
// REST API ENDPOINTS
// ----------------------------------------------------

// Reset Database API (Helper for easy testing in live previews)
app.post('/api/reset', (req, res) => {
  db = JSON.parse(JSON.stringify(DEFAULT_DB));
  dbSave(db);
  refreshAllTasks();
  emitDomainEvent('SystemReset', { origin: 'Dashboard' });
  res.json({ success: true, message: "Database reseeded to default Ethiopia records" });
});

// GET app status
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// GET Kitchen
app.get('/api/kitchen', (req, res) => {
  res.json(db.kitchen);
});

// GET Users
app.get('/api/users', (req, res) => {
  res.json(db.users);
});

// POST update Kitchen
app.post('/api/kitchen', (req, res) => {
  const { name, operating_days, pickup_address, contact_phone } = req.body;
  db.kitchen = {
    ...db.kitchen,
    name: name || db.kitchen.name,
    operating_days: operating_days || db.kitchen.operating_days,
    pickup_address: pickup_address || db.kitchen.pickup_address,
    contact_phone: contact_phone || db.kitchen.contact_phone
  };
  dbSave(db);
  refreshAllTasks();
  emitDomainEvent('KitchenUpdated', db.kitchen);
  res.json(db.kitchen);
});

// GET Meals (filtered to subscription types)
app.get('/api/meals', (req, res) => {
  res.json(db.meals);
});

// POST Meals
app.post('/api/meals', (req, res) => {
  const { name, photo_url, type, is_combo } = req.body;
  const newMeal: Meal = {
    id: `m_${Date.now()}`,
    name,
    photo_url: photo_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=400',
    type: type || 'non_fasting',
    is_combo: !!is_combo
  };
  db.meals.push(newMeal);
  
  // also update active menu
  db.menus[0].meals.push(newMeal);
  
  dbSave(db);
  emitDomainEvent('MealAdded', newMeal);
  res.status(201).json(newMeal);
});

// GET current Menu
app.get('/api/menu', (req, res) => {
  res.json(db.menus[0]);
});

// POST edit menu date range
app.post('/api/menu', (req, res) => {
  const { valid_from, valid_to, meals } = req.body;
  const menu = db.menus[0];
  if (valid_from) menu.valid_from = valid_from;
  if (valid_to) menu.valid_to = valid_to;
  if (meals) menu.meals = meals;
  dbSave(db);
  emitDomainEvent('MenuUpdated', menu);
  res.json(menu);
});

// GET Subscriptions (full summary)
app.get('/api/subscriptions', (req, res) => {
  const enriched = db.subscriptions.map(sub => {
    const user = db.users.find(u => u.id === sub.customer_id);
    return {
      ...sub,
      customer_name: user ? user.name : "Anonymous Customer",
      customer_phone: user ? user.phone : "",
      tasks: db.delivery_tasks.filter(t => t.subscription_id === sub.id)
    };
  });
  res.json(enriched);
});

// POST create subscription (Customer / TG)
app.post('/api/subscriptions', (req, res) => {
  const { customer_id, type, combo_preference, start_date, end_date, delivery_address } = req.body;
  
  const id = `sub_${Date.now()}`;
  const newSub: Subscription = {
    id,
    customer_id: Number(customer_id) || 3,
    type: type || 'hybrid',
    combo_preference: combo_preference || 'combo',
    start_date: start_date || '2026-06-08',
    end_date: end_date || '2026-06-19',
    payment_status: 'unpaid',
    delivery_address: delivery_address || "Ethiopia HQ",
    pickup_address: db.kitchen.pickup_address
  };

  db.subscriptions.push(newSub);
  dbSave(db);
  
  // Create default selections by cycling through filtered meals matching subscription type
  // Wait, let's auto-generate rotation selections first!
  const menuMeals = db.menus[0].meals;
  let subMeals = menuMeals.filter(m => {
    if (newSub.type === 'fasting') return m.type === 'fasting';
    if (newSub.type === 'non_fasting') return m.type === 'non_fasting';
    return true; // hybrid gets both
  });

  if (subMeals.length === 0) {
    subMeals = menuMeals; // fallback
  }

  // Iterate over weekdays Mon-Fri inside boundaries
  const start = parseDateString(newSub.start_date);
  const end = parseDateString(newSub.end_date);
  const current = new Date(start);
  
  let fastingIdx = 0;
  let nonFastingIdx = 0;
  const fastingMeals = subMeals.filter(m => m.type === 'fasting');
  const nonFastingMeals = subMeals.filter(m => m.type === 'non_fasting');

  while (current <= end) {
    const dayOfWeek = current.getDay();
    const dateStr = formatDateString(current);
    
    if (db.kitchen.operating_days.includes(dayOfWeek)) {
      // Is it fasting for this date/sub?
      const fasting = isFastingDay(dateStr, newSub.type, db.calendar_exceptions);
      let selectedMeal: Meal | undefined;
      
      if (fasting) {
        selectedMeal = fastingMeals.length > 0 ? fastingMeals[fastingIdx % fastingMeals.length] : subMeals[0];
        fastingIdx++;
      } else {
        selectedMeal = nonFastingMeals.length > 0 ? nonFastingMeals[nonFastingIdx % nonFastingMeals.length] : subMeals[0];
        nonFastingIdx++;
      }

      db.meal_selections.push({
        id: `sel_${Date.now()}_${dateStr}`,
        subscription_id: id,
        date: dateStr,
        meal_id: selectedMeal ? selectedMeal.id : 'm1'
      });
    }
    current.setDate(current.getDate() + 1);
  }

  dbSave(db);
  refreshAllTasks();
  emitDomainEvent('SubscriptionCreated', newSub);
  
  res.status(201).json(newSub);
});

// GET single subscription details with tasks and timelines
app.get('/api/subscriptions/:id', (req, res) => {
  const sub = db.subscriptions.find(s => s.id === req.params.id);
  if (!sub) {
    return res.status(404).json({ error: 'Subscription not found' });
  }
  const customer = db.users.find(u => u.id === sub.customer_id);
  const tasks = db.delivery_tasks.filter(t => t.subscription_id === sub.id);
  const selections = db.meal_selections.filter(s => s.subscription_id === sub.id).map(sel => {
    const meal = db.meals.find(m => m.id === sel.meal_id);
    return { ...sel, meal };
  });

  res.json({
    subscription: sub,
    customer,
    tasks,
    selections
  });
});

// POST pay subscription
app.post('/api/subscriptions/:id/pay', (req, res) => {
  const { amount, telebirr_ref, screenshot_url } = req.body;
  const sub = db.subscriptions.find(s => s.id === req.params.id);
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });

  sub.payment_status = 'paid';
  
  const payment: PaymentRecord = {
    id: `pay_${Date.now()}`,
    subscription_id: sub.id,
    amount: Number(amount) || 3000,
    telebirr_ref: telebirr_ref || `TEL${Date.now()}`,
    screenshot_url,
    recorded_at: new Date().toISOString()
  };

  db.payment_records.push(payment);
  dbSave(db);
  emitDomainEvent('PaymentRecorded', { subscription_id: sub.id, amount: payment.amount, telebirr_ref: payment.telebirr_ref });
  
  res.json({ success: true, subscription: sub, payment });
});

// POST custom meal rotations preview
app.post('/api/subscriptions/rotation-preview', (req, res) => {
  const { selected_meal_ids, type, start_date, end_date } = req.body;
  if (!selected_meal_ids || selected_meal_ids.length === 0) {
    return res.status(400).json({ error: 'No meals specified' });
  }

  const start = parseDateString(start_date || '2026-06-08');
  const end = parseDateString(end_date || '2026-06-19');
  const current = new Date(start);
  const preview: Array<{ date: string; fasting: boolean; meal: Meal }> = [];

  const selectedMeals = db.meals.filter(m => selected_meal_ids.includes(m.id));
  const fastingSelected = selectedMeals.filter(m => m.type === 'fasting');
  const nonFastingSelected = selectedMeals.filter(m => m.type === 'non_fasting');

  let fIdx = 0;
  let nfIdx = 0;

  while (current <= end) {
    const dayOfWeek = current.getDay();
    const dateStr = formatDateString(current);

    if (db.kitchen.operating_days.includes(dayOfWeek)) {
      const fasting = isFastingDay(dateStr, type || 'hybrid', db.calendar_exceptions);
      let meal: Meal | undefined;

      if (fasting) {
        meal = fastingSelected.length > 0 ? fastingSelected[fIdx % fastingSelected.length] : db.meals.find(m => m.type === 'fasting');
        fIdx++;
      } else {
        meal = nonFastingSelected.length > 0 ? nonFastingSelected[nfIdx % nonFastingSelected.length] : db.meals.find(m => m.type === 'non_fasting');
        nfIdx++;
      }

      if (meal) {
        preview.push({ date: dateStr, fasting, meal });
      }
    }
    current.setDate(current.getDate() + 1);
  }

  res.json(preview);
});

// POST confirm meal selections (commit rotation)
app.post('/api/subscriptions/:id/confirm-meals', (req, res) => {
  const { selections } = req.body; // array of { date, meal_id }
  const sub = db.subscriptions.find(s => s.id === req.params.id);
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });

  // Clear existing selections of this sub
  db.meal_selections = db.meal_selections.filter(s => s.subscription_id !== sub.id);

  // Push new selections
  for (const s of selections) {
    db.meal_selections.push({
      id: `sel_${Date.now()}_${s.date}_${Math.random().toString(36).substr(2, 4)}`,
      subscription_id: sub.id,
      date: s.date,
      meal_id: s.meal_id
    });
  }

  dbSave(db);
  refreshAllTasks();
  emitDomainEvent('SubscriptionConfirmed', { subscription_id: sub.id });
  
  res.json({ success: true });
});

// PUT update individual single day selection
app.put('/api/subscriptions/:id/meals', (req, res) => {
  const { date, meal_id } = req.body;
  const sub = db.subscriptions.find(s => s.id === req.params.id);
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });

  // Update selection
  const selection = db.meal_selections.find(s => s.subscription_id === sub.id && s.date === date);
  if (selection) {
    selection.meal_id = meal_id;
  } else {
    db.meal_selections.push({
      id: `sel_${Date.now()}_${date}`,
      subscription_id: sub.id,
      date,
      meal_id
    });
  }

  dbSave(db);
  refreshAllTasks();
  emitDomainEvent('MealSelectionUpdated', { subscription_id: sub.id, date, meal_id });

  res.json({ success: true });
});

// GET exceptions
app.get('/api/exceptions', (req, res) => {
  res.json(db.calendar_exceptions);
});

// POST add calendar exceptions & trigger recalculations
app.post('/api/exceptions', (req, res) => {
  const { date, type, reason } = req.body;
  if (!date || !type) {
    return res.status(400).json({ error: 'Missing date or type' });
  }

  const id = `ex_${Date.now()}`;
  const newException: CalendarException = {
    id,
    date,
    type, // holiday, closure, fasting_period
    reason: reason || "Scheduled custom exception"
  };

  db.calendar_exceptions.push(newException);
  dbSave(db);
  refreshAllTasks();

  if (type === 'holiday') {
    emitDomainEvent('HolidayAdded', newException);

    // Find and verify compensations added
    const affectedSubIds = db.delivery_tasks
      .filter(t => t.date === date || (t.is_compensation && t.compensation_reason?.includes(date)))
      .map(t => t.subscription_id);

    // Filter unique
    const uniqueSubs = Array.from(new Set(affectedSubIds));
    for (const subId of uniqueSubs) {
      const tasks = db.delivery_tasks.filter(t => t.subscription_id === subId);
      const compensationTask = tasks.find(t => t.is_compensation && t.compensation_reason?.includes(date));
      if (compensationTask) {
        emitDomainEvent('CompensationApplied', {
          subscription_id: subId,
          skipped_date: date,
          reason: reason,
          compensating_date: compensationTask.date
        });
      }
    }
  } else if (type === 'fasting_period') {
    emitDomainEvent('FastingPeriodDeclared', newException);
  } else {
    emitDomainEvent('ClosureAdded', newException);
  }

  res.status(201).json(newException);
});

// DELETE exception & triggers recalculations
app.delete('/api/exceptions/:id', (req, res) => {
  const exceptionIdx = db.calendar_exceptions.findIndex(ex => String(ex.id) === String(req.params.id));
  if (exceptionIdx === -1) {
    return res.status(404).json({ error: 'Exception not found' });
  }

  const ex = db.calendar_exceptions[exceptionIdx];
  db.calendar_exceptions.splice(exceptionIdx, 1);
  dbSave(db);
  refreshAllTasks();

  if (ex.type === 'holiday') {
    emitDomainEvent('HolidayRemoved', ex);
  } else {
    emitDomainEvent('ExceptionRemoved', ex);
  }

  res.json({ success: true, removed: ex });
});

// GET Driver Manifest tasks for today or specified date
app.get('/api/delivery-tasks', (req, res) => {
  const { date } = req.query;
  const targetDate = typeof date === 'string' ? date : '2026-06-08';
  
  const tasks = db.delivery_tasks.filter(t => t.date === targetDate);
  const enriched = tasks.map(task => {
    const sub = db.subscriptions.find(s => s.id === task.subscription_id);
    const user = sub ? db.users.find(u => u.id === sub.customer_id) : null;
    const selection = sub ? db.meal_selections.find(s => s.subscription_id === sub.id && s.date === task.date) : null;
    const meal = selection ? db.meals.find(m => m.id === selection.meal_id) : null;

    return {
      ...task,
      customer_name: user ? user.name : "Anonymous Stop",
      customer_phone: user ? user.phone : "",
      meal_name: meal ? meal.name : "Unscheduled Meal",
      meal_type: meal ? meal.type : "non_fasting",
      combo_preference: sub ? sub.combo_preference : 'combo'
    };
  });

  res.json(enriched);
});

// PUT update status of deliveries (idempotent)
app.put('/api/delivery-tasks/:id/status', (req, res) => {
  const { status, failure_reason } = req.body;
  const task = db.delivery_tasks.find(t => String(t.id) === String(req.params.id));
  if (!task) {
    return res.status(404).json({ error: 'Delivery task not found' });
  }

  task.status = status; // delivered, failed, pending
  if (status === 'failed') {
    task.failure_reason = failure_reason || "Unspecified gate access issue";
  } else {
    delete task.failure_reason;
  }

  dbSave(db);
  
  if (status === 'delivered') {
    emitDomainEvent('DeliveryCompleted', { task_id: task.id, date: task.date, subscription_id: task.subscription_id });
  } else if (status === 'failed') {
    emitDomainEvent('DeliveryFailed', { task_id: task.id, date: task.date, subscription_id: task.subscription_id, reason: task.failure_reason });
  }

  res.json({ success: true, task });
});

// GET Domain events log
app.get('/api/events', (req, res) => {
  // Return reversed to show latest first
  res.json([...db.domain_events].reverse());
});

// GET Customers search
app.get('/api/customers', (req, res) => {
  const customers = db.users.filter(u => u.role === 'customer');
  const enriched = customers.map(cust => {
    const subs = db.subscriptions.filter(s => s.customer_id === cust.id);
    return {
      ...cust,
      subscriptions_count: subs.length,
      history: subs
    };
  });
  res.json(enriched);
});

// PUT update pickup or delivery address
app.put('/api/customers/:id', (req, res) => {
  const user = db.users.find(u => u.id === Number(req.params.id) || u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Customer not found' });

  const { address, phone, name } = req.body;
  if (address) user.address = address;
  if (phone) user.phone = phone;
  if (name) user.name = name;

  // Sync address changes to the active subscriptions
  db.subscriptions.forEach(sub => {
    if (sub.customer_id === user.id) {
      if (address) sub.delivery_address = `${user.name} - ${address}`;
    }
  });

  dbSave(db);
  refreshAllTasks();
  emitDomainEvent('CustomerProfileUpdated', { customer_id: user.id });
  res.json(user);
});

// Telegram Auth Route (Validate raw Telegram TMA initData)
app.post('/api/auth/telegram', (req, res) => {
  const { initData, bypass, mockUserId } = req.body;
  const botToken = process.env.TELEGRAM_BOT_TOKEN || 'mock_bot_token';

  // Demo bypass mode to make testing in browser previews straightforward
  if (bypass || !initData || initData === 'demo_init_data') {
    const targetUserId = Number(mockUserId) || 3;
    const user = db.users.find(u => u.id === targetUserId);
    return res.json({
      success: true,
      bypassed: true,
      user: user || { id: 3, role: 'customer', name: 'Deborah Mezmur', phone: '+251933333333' }
    });
  }

  const result = verifyTelegramWebAppData(initData, botToken);
  
  if (!result.success) {
    return res.status(401).json({ error: result.error || 'Authentication signature verification failed' });
  }

  // Resolve Telegram user.id to a User record or register
  const telegramUserId = result.data.user?.id || 'tg_unknown';
  const telegramFirstName = result.data.user?.first_name || 'TG Customer';
  let user = db.users.find(u => String(u.telegram_user_id) === String(telegramUserId));

  if (!user) {
    // Register automatic TG profile
    user = {
      id: `u_${Date.now()}`,
      role: 'customer',
      telegram_user_id: String(telegramUserId),
      phone: '+251 900 000000', // needs validation later
      name: telegramFirstName,
      address: 'Addis Ababa'
    };
    db.users.push(user);
    dbSave(db);
    emitDomainEvent('TelegramUserRegistered', user);
  }

  res.json({
    success: true,
    bypassed: false,
    user
  });
});

// ----------------------------------------------------
// VITE AND STATIC SERVING
// ----------------------------------------------------
async function startServer() {
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
    console.log(`Server executing successfully on http://0.0.0.0:${PORT}`);
    console.log(`Live Mode: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer();
