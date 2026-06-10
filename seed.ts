import fs from 'fs';
import path from 'path';
import db from './db.js';

async function seed() {
  console.log("Seeding Oz Kitchen PostgreSQL database...");

  try {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      await client.query('DROP TABLE IF EXISTS notifications, driver_locations, domain_events, payment_records, delivery_tasks, calendar_exceptions, meal_selections, subscriptions, menu_meals, menus, meals, users, kitchen CASCADE');
      
      const schemaPath = path.join(process.cwd(), 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await client.query(schema);
      console.log('PostgreSQL schema initialized.');

      await client.query(`
        INSERT INTO kitchen (id, name, operating_days, pickup_address, contact_phone)
        VALUES (1, 'Oz Kitchen Central', '[1,2,3,4,5]', 'Bole, Behind Edna Mall, Addis Ababa, Ethiopia', '+251 911 234567')
      `);

      await client.query(`
        INSERT INTO users (id, role, phone, name, address) VALUES
        ('1', 'admin', '+251911111111', 'Almaz Tadesse (Manager)', 'HQ'),
        ('2', 'driver', '+251922222222', 'Abebe Kebede (Lead Driver)', 'Fleet HQ'),
        ('3', 'customer', '+251933333333', 'Deborah Mezmur (Tech Lead)', 'Wollo Sefer, Kasanchis Block, Floor 4')
      `);

      await client.query(`
        INSERT INTO meals (id, name, photo_url, type, is_combo, ingredients) VALUES
        ('m1', 'Shiro Wat with Injera', 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?auto=format&fit=crop&q=80&w=400', 'fasting', false, 'Chickpeas powder, Berbere spice, Onions, Garlic, Vegetable oil, Injera'),
        ('m2', 'Misir Wat (Spicy Lentils)', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=400', 'fasting', false, 'Red lentils, Berbere spice, Onions, Garlic, Ginger, Vegetable oil, Injera'),
        ('m3', 'Beyaynetu (Fasting Platter)', 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?auto=format&fit=crop&q=80&w=400', 'fasting', true, 'Misir wat, Shiro, Yellow split peas, Cabbage, Collard greens, Beetroot, Injera'),
        ('m4', 'Fasting Firfir', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=400', 'fasting', false, 'Torn injera, Berbere spice, Onions, Tomatoes, Garlic, Vegetable oil'),
        ('m5', 'Doro Wat (Chicken Stew)', 'https://images.unsplash.com/photo-1604152135912-04a022e23696?auto=format&fit=crop&q=80&w=400', 'non_fasting', true, 'Chicken, Red onions, Berbere spice, Spiced butter, Garlic, Ginger, Hard-boiled eggs, Injera'),
        ('m6', 'Dereq Tibs with Injera', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=400', 'non_fasting', false, 'Beef chunks, Onions, Garlic, Rosemary, Green chili pepper, Spiced butter, Injera'),
        ('m7', 'Beef Alicha Wat', 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=400', 'non_fasting', false, 'Beef chunks, Potatoes, Turmeric, Garlic, Ginger, Onions, Injera'),
        ('m8', 'Chef Special Meat Combo', 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=400', 'non_fasting', true, 'Beef tibs, Doro wat, Lamb stew, Collard greens with beef, Cottage cheese, Injera')
      `);

      await client.query('INSERT INTO menus (id, valid_from, valid_to) VALUES (1, \'2026-06-01\', \'2026-06-30\')');

      await client.query(`
        INSERT INTO menu_meals (menu_id, meal_id) VALUES
        (1, 'm1'), (1, 'm2'), (1, 'm3'), (1, 'm4'), (1, 'm5'), (1, 'm6'), (1, 'm7'), (1, 'm8')
      `);

      const today = new Date();
      const nextMon = new Date(today);
      nextMon.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7));
      const startStr = nextMon.toISOString().split('T')[0];
      const end = new Date(nextMon);
      end.setDate(nextMon.getDate() + 11); // 2 weeks
      const endStr = end.toISOString().split('T')[0];

      await client.query(`
        INSERT INTO subscriptions (id, customer_id, type, combo_preference, start_date, end_date, payment_status, delivery_address, pickup_address)
        VALUES ('sub_active_1', '3', 'hybrid', 'combo', $1, $2, 'paid', 'Deborah Mezmur - Wollo Sefer, Floor 4', 'Bole, Behind Edna Mall, Addis Ababa, Ethiopia')
      `, [startStr, endStr]);

      // We won't hardcode meal_selections here because the app will generate them 
      // when we call refreshAllTasks or similar, but for seed we can just leave it for now
      // Actually, server.ts has a refreshAllTasks but it's not exposed as a CLI tool easily.
      // I'll just let the subscription be created and the user can 'refresh' in UI if needed.
      // Or I can add a few selections.

      await client.query('INSERT INTO menus (id, valid_from, valid_to) VALUES (1, \'2026-06-01\', \'2026-06-30\')');

      console.log("Database seeded successfully.");
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Error seeding database:", err);
  } finally {
    process.exit(0);
  }
}

seed();
