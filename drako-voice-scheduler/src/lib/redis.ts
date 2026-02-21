import Redis from 'ioredis';

const getRedisClient = () => {
  const url = process.env.REDIS_URL!;
  const isTLS = url.startsWith('rediss://');
  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
    enableOfflineQueue: false,
    tls: isTLS ? { rejectUnauthorized: false } : undefined,
    retryStrategy(times) {
      if (times > 3) return null; // stop retrying in serverless
      return Math.min(times * 100, 1000);
    },
  });
  client.on('error', (err) => console.error('Redis error:', err));
  return client;
};

// Singleton for main operations
let redis: Redis | null = null;
export const getRedis = () => {
  if (!redis) redis = getRedisClient();
  return redis;
};

// Fresh client for pub/sub (subscribers need dedicated connections)
export const createSubscriber = () => getRedisClient();

// Schedule helpers
export const SCHEDULE_KEY = (userId: string, date: string) => `schedule:${userId}:${date}`;

export const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export interface ScheduleEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  date: string;
  color?: string;
}

export const addEvent = async (userId: string, event: ScheduleEvent) => {
  const r = getRedis();
  const score = timeToMinutes(event.start);
  await r.zadd(SCHEDULE_KEY(userId, event.date), score, JSON.stringify(event));
  await r.publish('schedule:updates', JSON.stringify({ type: 'add', event, timestamp: new Date().toISOString() }));
  return event;
};

export const getSchedule = async (userId: string, date: string): Promise<ScheduleEvent[]> => {
  const r = getRedis();
  const raw = await r.zrangebyscore(SCHEDULE_KEY(userId, date), 0, 1440);
  return raw.map((s) => JSON.parse(s));
};

export const removeEvent = async (userId: string, date: string, eventId: string) => {
  const r = getRedis();
  const events = await getSchedule(userId, date);
  const target = events.find((e) => e.id === eventId);
  if (target) {
    await r.zrem(SCHEDULE_KEY(userId, date), JSON.stringify(target));
    await r.publish('schedule:updates', JSON.stringify({ type: 'remove', event: target, timestamp: new Date().toISOString() }));
  }
  return target;
};

// ── User Management ──

export interface UserProfile {
  id: string;
  name: string;
  type: string;
  rhythm: string;
  nonNegotiables: string[];
  struggle: string;
  createdAt: string;
  // Legacy fields (kept for backward compat)
  role?: string;
  workStyle?: string;
  priorities?: string;
}

export const USER_KEY = (userId: string) => `user:${userId}`;

export const getUser = async (userId: string): Promise<UserProfile | null> => {
  const r = getRedis();
  const data = await r.get(USER_KEY(userId));
  return data ? JSON.parse(data as string) : null;
};
