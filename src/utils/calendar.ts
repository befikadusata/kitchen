export interface Kitchen {
  id: string | number;
  name: string;
  operating_days: number[]; // e.g., [1,2,3,4,5] for Mon-Fri
  pickup_address: string;
  contact_phone: string;
}

export interface User {
  id: string | number;
  role: 'admin' | 'staff' | 'customer' | 'driver';
  telegram_user_id?: string;
  phone: string;
  name?: string;
  address?: string;
}

export interface Meal {
  id: string | number;
  name: string;
  photo_url: string;
  type: 'fasting' | 'non_fasting';
  is_combo: boolean;
}

export interface Menu {
  id: string | number;
  valid_from: string; // YYYY-MM-DD
  valid_to: string;   // YYYY-MM-DD
  meals: Meal[];
}

export interface Subscription {
  id: string | number;
  customer_id: string | number;
  type: 'fasting' | 'hybrid' | 'non_fasting';
  combo_preference: 'combo' | 'single';
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  payment_status: 'paid' | 'unpaid';
  delivery_address?: string;
  pickup_address?: string;
}

export interface MealSelection {
  id: string | number;
  subscription_id: string | number;
  date: string; // YYYY-MM-DD
  meal_id: string | number;
}

export interface CalendarException {
  id: string | number;
  date: string; // YYYY-MM-DD
  type: 'holiday' | 'closure' | 'compensation' | 'fasting_period';
  reason: string;
  linked_exception_id?: string | number;
  subscription_id?: string | number; // For compensation exceptions attached to a specific subscription
}

export interface DeliveryTask {
  id: string | number;
  date: string; // YYYY-MM-DD
  subscription_id: string | number;
  meal_selection_id: string | number;
  pickup_address: string;
  delivery_address: string;
  status: 'pending' | 'delivered' | 'failed';
  failure_reason?: string;
  is_compensation?: boolean;
  compensation_reason?: string;
}

export interface PaymentRecord {
  id: string | number;
  subscription_id: string | number;
  amount: number;
  telebirr_ref: string;
  screenshot_url?: string;
  recorded_at: string;
}

export interface DomainEvent {
  id: string | number;
  type: string;
  payload: any;
  created_at: string;
}

/**
 * Parses YYYY-MM-DD string to Date object (local time)
 */
export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Formats Date object to YYYY-MM-DD string (local time)
 */
export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Pure function to generate delivery tasks for a subscription.
 * Implements the core business scheduling & calendar engine logic.
 */
export function generateDeliveryTasks(
  subscription: Subscription,
  mealSelections: MealSelection[],
  calendarExceptions: CalendarException[],
  kitchenOperatingDays: number[], // e.g. [1, 2, 3, 4, 5] (where 1=Mon, 5=Fri)
  pickupAddress: string = "Kitchen Central",
  deliveryAddress: string = "Customer Address"
): { tasks: DeliveryTask[]; sideEffectExceptions: CalendarException[] } {
  const start = parseDateString(subscription.start_date);
  const end = parseDateString(subscription.end_date);
  const tasks: DeliveryTask[] = [];
  const sideEffectExceptions: CalendarException[] = [];

  // Exclude days marked as holiday or closure
  const holidayOrClosureDates = new Set<string>();
  const exceptionsMap = new Map<string, CalendarException>();

  for (const ex of calendarExceptions) {
    if (ex.type === 'holiday' || ex.type === 'closure') {
      holidayOrClosureDates.add(ex.date);
      exceptionsMap.set(ex.date, ex);
    }
  }

  // Set of all dates currently scheduled for delivery
  const scheduledDates = new Set<string>();

  // 1. Traverse all dates in the subscription range
  const current = new Date(start);
  let skippedDaysCount = 0;
  const skippedDetails: Array<{ date: string; exceptionId: string | number }> = [];

  while (current <= end) {
    const dayOfWeek = current.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const dateStr = formatDateString(current);

    // Is it a weekday (Mon-Fri) based on kitchen specs?
    // standard Mon-Fri is [1,2,3,4,5]
    if (kitchenOperatingDays.includes(dayOfWeek)) {
      if (holidayOrClosureDates.has(dateStr)) {
        // Holiday or closure: skip but save detail for compensation
        const ex = exceptionsMap.get(dateStr);
        skippedDaysCount++;
        skippedDetails.push({
          date: dateStr,
          exceptionId: ex?.id || 'unknown_holiday'
        });
      } else {
        // Active delivery task date
        scheduledDates.add(dateStr);
        
        // Find assigned meal
        const selection = mealSelections.find(s => s.date === dateStr);
        tasks.push({
          id: `task_${subscription.id}_${dateStr}`,
          date: dateStr,
          subscription_id: subscription.id,
          meal_selection_id: selection ? selection.id : `temp_select_${Date.now()}_${dateStr}`,
          pickup_address: subscription.pickup_address || pickupAddress,
          delivery_address: subscription.delivery_address || deliveryAddress,
          status: 'pending'
        });
      }
    }
    
    // Increment date
    current.setDate(current.getDate() + 1);
  }

  // 2. Add compensations for skipped days
  // Find "next available working day not already in the task list" for each skipped day
  const compensator = new Date(end);
  compensator.setDate(compensator.getDate() + 1); // Start search from after the subscription end_date

  for (const skip of skippedDetails) {
    let found = false;
    while (!found) {
      const dayOfWeek = compensator.getDay();
      const compDateStr = formatDateString(compensator);

      // Check if it's an operating weekday, not a holiday/closure, and not already scheduled
      const isOperatingDay = kitchenOperatingDays.includes(dayOfWeek);
      const isHolidayOrClosure = holidayOrClosureDates.has(compDateStr);
      const isAlreadyScheduled = scheduledDates.has(compDateStr);

      if (isOperatingDay && !isHolidayOrClosure && !isAlreadyScheduled) {
        // Use this compensation date
        scheduledDates.add(compDateStr);

        // Find standard or fallback meal selection for compensation
        // Try to recycle meal selection for skipped date if available, or just use next one
        const originalSelection = mealSelections.find(s => s.date === skip.date);
        const mealId = originalSelection ? originalSelection.meal_id : (mealSelections[0]?.meal_id || 'fallback_meal');

        const compExceptionId = `comp_ex_${subscription.id}_${skip.date}_for_${compDateStr}`;
        
        sideEffectExceptions.push({
          id: compExceptionId,
          date: compDateStr,
          type: 'compensation',
          reason: `Compensation for skipped operating day on ${skip.date}`,
          linked_exception_id: skip.exceptionId,
          subscription_id: subscription.id
        });

        tasks.push({
          id: `task_${subscription.id}_${compDateStr}`,
          date: compDateStr,
          subscription_id: subscription.id,
          meal_selection_id: originalSelection ? originalSelection.id : `comp_selection_${Date.now()}_${compDateStr}`,
          pickup_address: subscription.pickup_address || pickupAddress,
          delivery_address: subscription.delivery_address || deliveryAddress,
          status: 'pending',
          is_compensation: true,
          compensation_reason: `Compensation for ${skip.date}`
        });

        found = true;
      }
      // advance compensator day-by-day
      compensator.setDate(compensator.getDate() + 1);
    }
  }

  // Sort tasks chronologically
  tasks.sort((a, b) => a.date.localeCompare(b.date));

  return {
    tasks,
    sideEffectExceptions
  };
}

/**
 * Determines whether the given date is a fasting day for the subscriber.
 * Rule:
 * - If subscription is 'fasting' -> always fasting.
 * - If subscription is 'non_fasting' -> never fasting.
 * - If subscription is 'hybrid':
 *   - Wednesdays and Fridays are fasting days.
 *   - If within any kitchen-declared fasting period, those are also fasting.
 */
export function isFastingDay(
  dateStr: string,
  subscriptionType: 'fasting' | 'hybrid' | 'non_fasting',
  calendarExceptions: CalendarException[]
): boolean {
  if (subscriptionType === 'fasting') return true;
  if (subscriptionType === 'non_fasting') return false;

  // For hybrid subscriptions
  const date = parseDateString(dateStr);
  const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon, ..., 3 = Wed, 5 = Fri, 6 = Sat

  // Wednesdays and Fridays are fasting days
  if (dayOfWeek === 3 || dayOfWeek === 5) {
    return true;
  }

  // Check if there is an active fasting_period exception that covers this date
  const isCoveredByFastingPeriod = calendarExceptions.some(ex => {
    if (ex.type === 'fasting_period') {
      // Fasting periods are typically range declarations.
      // If the exception date matches exactly, it's fasting.
      // If description contains a range (or if we declare single dates as 'fasting_period' exceptions)
      return ex.date === dateStr;
    }
    return false;
  });

  return isCoveredByFastingPeriod;
}
