import { format, parse, isValid, isToday, isTomorrow, isYesterday, startOfDay, isBefore, parseISO } from 'date-fns';

/**
 * Bookings store dates as the display strings produced by the client booking flow
 * ("Tue, 10 Jun" / "10:00 AM") plus, on newer records, `dateISO` and `scheduledAt`.
 * These helpers turn any of those into real Dates so lists can be sorted and labelled.
 */

export type BookingStatus = 'confirmed' | 'completed' | 'cancelled';
export type CallStatus = 'not_started' | 'ongoing' | 'ended';
export type SessionType = 'Chat' | 'Voice' | 'Video';

export interface BookingRecord {
  _id: string;
  clientId?: string;
  counsellorId?: string;
  counsellorName: string;
  clientName?: string;
  clientPhone?: string;
  sessionType: SessionType;
  dateText: string;
  dateISO?: string;
  timeText: string;
  scheduledAt?: string;
  price: string;
  status: BookingStatus;
  callStatus?: CallStatus;
  paymentStatus?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const DATE_TEXT_FORMAT = 'EEE, d MMM';
export const SESSION_DURATION_MIN = 40;

export const toDateText = (date: Date) => format(date, DATE_TEXT_FORMAT);

/** Best-effort day for a booking: dateISO → dateText ("Tue, 10 Jun", current year). */
export const bookingDay = (b: Pick<BookingRecord, 'dateText' | 'dateISO'>): Date | null => {
  if (b.dateISO) {
    const d = parseISO(b.dateISO);
    if (isValid(d)) return d;
  }
  if (!b.dateText) return null;
  const d = parse(b.dateText, DATE_TEXT_FORMAT, new Date());
  return isValid(d) ? d : null;
};

/** Exact start time: scheduledAt → day + timeText. */
export const bookingStart = (b: Pick<BookingRecord, 'dateText' | 'dateISO' | 'timeText' | 'scheduledAt'>): Date | null => {
  if (b.scheduledAt) {
    const d = parseISO(b.scheduledAt);
    if (isValid(d)) return d;
  }
  const day = bookingDay(b);
  if (!day || !b.timeText) return day;
  const withTime = parse(`${format(day, 'yyyy-MM-dd')} ${b.timeText}`, 'yyyy-MM-dd h:mm a', new Date());
  return isValid(withTime) ? withTime : day;
};

/** Today / Tomorrow / Yesterday, otherwise the original dateText. */
export const relativeDayLabel = (b: Pick<BookingRecord, 'dateText' | 'dateISO'>): string => {
  const d = bookingDay(b);
  if (!d) return b.dateText;
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  if (isYesterday(d)) return 'Yesterday';
  return b.dateText;
};

/** "Thu, 5 Jun 2026" — full date used in history lists. */
export const longDateLabel = (b: Pick<BookingRecord, 'dateText' | 'dateISO'>): string => {
  const d = bookingDay(b);
  return d ? format(d, 'EEE, d MMM yyyy') : b.dateText;
};

export const isSameBookingDay = (b: Pick<BookingRecord, 'dateText' | 'dateISO'>, date: Date): boolean => {
  const d = bookingDay(b);
  return !!d && format(d, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
};

export const sortBookingsAsc = <T extends BookingRecord>(list: T[]): T[] =>
  [...list].sort((a, b) => (bookingStart(a)?.getTime() ?? 0) - (bookingStart(b)?.getTime() ?? 0));

export const sortBookingsDesc = <T extends BookingRecord>(list: T[]): T[] => sortBookingsAsc(list).reverse();

/** Confirmed bookings on or after the given day, soonest first. */
export const upcomingFrom = (list: BookingRecord[], from: Date = new Date()): BookingRecord[] => {
  const start = startOfDay(from);
  return sortBookingsAsc(
    list.filter((b) => {
      if (b.status !== 'confirmed') return false;
      const d = bookingDay(b);
      return d ? !isBefore(d, start) : false;
    })
  );
};

/** Compact rupee string: 18000 → "₹18k", 1250 → "₹1.3k", 800 → "₹800". */
export const compactRupees = (amount: number): string => {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `₹${Math.round(amount)}`;
};

/** Pulls the numeric part out of "₹18,000" style strings. */
export const parseRupees = (value?: string | number): number => {
  if (typeof value === 'number') return value;
  return parseFloat(String(value ?? '').replace(/[^0-9.]/g, '')) || 0;
};

export const timeOfDayGreeting = (date: Date = new Date()): string => {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};
