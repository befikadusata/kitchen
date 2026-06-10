-- Oz Kitchen PostgreSQL Schema

-- KITCHEN
CREATE TABLE IF NOT EXISTS kitchen (
    id SERIAL PRIMARY KEY,
    name TEXT,
    operating_days TEXT,
    pickup_address TEXT,
    contact_phone TEXT
);

-- USERS
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    role TEXT,
    telegram_user_id TEXT,
    phone TEXT,
    name TEXT,
    address TEXT,
    password_hash TEXT
);

-- MEALS
CREATE TABLE IF NOT EXISTS meals (
    id TEXT PRIMARY KEY,
    name TEXT,
    photo_url TEXT,
    type TEXT,
    is_combo BOOLEAN,
    ingredients TEXT
);

-- MENUS
CREATE TABLE IF NOT EXISTS menus (
    id SERIAL PRIMARY KEY,
    valid_from TEXT,
    valid_to TEXT
);

-- MENU MEALS (JOIN TABLE)
CREATE TABLE IF NOT EXISTS menu_meals (
    menu_id INTEGER REFERENCES menus(id),
    meal_id TEXT REFERENCES meals(id),
    PRIMARY KEY (menu_id, meal_id)
);

-- SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES users(id),
    type TEXT,
    combo_preference TEXT,
    start_date TEXT,
    end_date TEXT,
    payment_status TEXT,
    delivery_address TEXT,
    pickup_address TEXT
);

-- MEAL SELECTIONS
CREATE TABLE IF NOT EXISTS meal_selections (
    id TEXT PRIMARY KEY,
    subscription_id TEXT REFERENCES subscriptions(id),
    date TEXT,
    meal_id TEXT REFERENCES meals(id)
);

-- CALENDAR EXCEPTIONS
CREATE TABLE IF NOT EXISTS calendar_exceptions (
    id TEXT PRIMARY KEY,
    date TEXT,
    type TEXT,
    reason TEXT,
    linked_exception_id TEXT,
    subscription_id TEXT
);

-- DELIVERY TASKS
CREATE TABLE IF NOT EXISTS delivery_tasks (
    id TEXT PRIMARY KEY,
    date TEXT,
    subscription_id TEXT REFERENCES subscriptions(id),
    meal_selection_id TEXT,
    pickup_address TEXT,
    delivery_address TEXT,
    status TEXT,
    failure_reason TEXT,
    is_compensation BOOLEAN,
    compensation_reason TEXT
);

-- PAYMENT RECORDS
CREATE TABLE IF NOT EXISTS payment_records (
    id TEXT PRIMARY KEY,
    subscription_id TEXT REFERENCES subscriptions(id),
    amount REAL,
    telebirr_ref TEXT,
    screenshot_url TEXT,
    recorded_at TEXT
);

-- DOMAIN EVENTS
CREATE TABLE IF NOT EXISTS domain_events (
    id TEXT PRIMARY KEY,
    type TEXT,
    payload TEXT,
    created_at TEXT
);

-- DRIVER LOCATIONS
CREATE TABLE IF NOT EXISTS driver_locations (
    driver_id TEXT REFERENCES users(id),
    latitude REAL,
    longitude REAL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (driver_id)
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(id), -- Can be NULL for global/admin notifications
    title TEXT,
    message TEXT,
    type TEXT, -- 'info', 'success', 'warning', 'error'
    surface TEXT, -- 'admin', 'telegram', 'driver'
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
