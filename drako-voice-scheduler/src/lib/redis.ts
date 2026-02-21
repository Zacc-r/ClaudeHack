import Redis from 'ioredis';

export interface ScheduleEvent {
  id: string;
  title: string;
  start: string;
  end: string | null;
  date: string;
  color?: string;
}

let redis: Redis | null = null;
let subscriber: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }
  return redis;
}

export function createSubscriber(): Redis {
  return new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function scheduleKey(userId: string, date: string): string {
  return `schedule:${userId}:${date}`;
}

export async function getSchedule(userId: string, date: string): Promise<ScheduleEvent[]> {
  const redis = getRedis();
  const data = await redis.get(scheduleKey(userId, date));
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function addEvent(userId: string, event: ScheduleEvent): Promise<void> {
  const redis = getRedis();
  const key = scheduleKey(userId, event.date);
  const events = await getSchedule(userId, event.date);
  events.push(event);
  events.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  await redis.set(key, JSON.stringify(events));
  await redis.publish('schedule:updates', JSON.stringify({ type: 'add', userId, event }));
}

export async function removeEvent(userId: string, date: string, eventId: string): Promise<ScheduleEvent | null> {
  const redis = getRedis();
  const key = scheduleKey(userId, date);
  const events = await getSchedule(userId, date);
  const index = events.findIndex(e => e.id === eventId);
  if (index === -1) return null;
  const [removed] = events.splice(index, 1);
  await redis.set(key, JSON.stringify(events));
  await redis.publish('schedule:updates', JSON.stringify({ type: 'remove', userId, event: removed }));
  return removed;
}
