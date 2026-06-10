import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Kitchen, User, Meal, Menu, Subscription, CalendarException, DeliveryTask, DomainEvent } from '../utils/calendar';

interface Notification {
  id: number;
  user_id: string | null;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  surface: 'admin' | 'telegram' | 'driver';
  is_read: boolean;
  created_at: string;
}

interface AppContextType {
  kitchen: Kitchen | null;
  users: User[];
  meals: Meal[];
  menu: Menu | null;
  subscriptions: Subscription[];
  exceptions: CalendarException[];
  tasks: DeliveryTask[];
  events: DomainEvent[];
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  refreshState: () => Promise<void>;
  markNotificationRead: (id: number) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [kitchen, setKitchen] = useState<Kitchen | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [exceptions, setExceptions] = useState<CalendarException[]>([]);
  const [tasks, setTasks] = useState<DeliveryTask[]>([]);
  const [events, setEvents] = useState<DomainEvent[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const fetchAllState = useCallback(async () => {
    try {
      // Determine surface for notifications based on URL
      let surface = 'admin';
      if (window.location.pathname.startsWith('/telegram')) surface = 'telegram';
      if (window.location.pathname.startsWith('/driver')) surface = 'driver';

      const [rKitchen, rUsers, rMeals, rMenu, rSubs, rEx, rEvents, rNotifs] = await Promise.all([
        fetch('/api/kitchen'),
        fetch('/api/users'),
        fetch('/api/meals'),
        fetch('/api/menu'),
        fetch('/api/subscriptions'),
        fetch('/api/exceptions'),
        fetch('/api/events'),
        fetch(`/api/notifications?surface=${surface}`)
      ]);
      
      if (!rKitchen.ok || !rUsers.ok || !rMeals.ok || !rMenu.ok || !rSubs.ok || !rEx.ok || !rEvents.ok) {
        throw new Error("Backend synchronization failure.");
      }

      const [kitchenData, usersData, mealsData, menuData, subsData, exData, eventsData, notifsData] = await Promise.all([
        rKitchen.json(),
        rUsers.json(),
        rMeals.json(),
        rMenu.json(),
        rSubs.json(),
        rEx.json(),
        rEvents.json(),
        rNotifs.json()
      ]);

      setKitchen(kitchenData);
      setUsers(usersData);
      setMeals(mealsData);
      setMenu(menuData);
      setSubscriptions(subsData);
      setExceptions(exData);
      setEvents(eventsData);
      setNotifications(notifsData);

      const allTasks: DeliveryTask[] = subsData.flatMap((s: any) => s.tasks || []);
      allTasks.sort((a, b) => a.date.localeCompare(b.date));
      setTasks(allTasks);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const markNotificationRead = async (id: number) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAllState();
    const timer = setInterval(fetchAllState, 10000);
    return () => clearInterval(timer);
  }, [fetchAllState]);

  useEffect(() => {
    if (!currentUser && users.length > 0) {
      const saved = localStorage.getItem('oz_user');
      if (saved) {
        setCurrentUser(JSON.parse(saved));
      }
    }
  }, [users, currentUser]);

  return (
    <AppContext.Provider value={{
      kitchen, users, meals, menu, subscriptions, exceptions, tasks, events, notifications,
      loading, error, currentUser, setCurrentUser,
      refreshState: fetchAllState,
      markNotificationRead
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
