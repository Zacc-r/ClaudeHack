import Redis from 'ioredis';

const getRedisClient = () => {
  const client = new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
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
  role?: string;
  workStyle?: string;
  priorities?: string;
  createdAt: string;
}

export interface OnboardingSurvey {
  name: string;
  role: string;
  workStyle: string;
  priorities: string[];
  wakeUpTime?: string;
}

export const USER_KEY = (userId: string) => `user:${userId}`;

export const createUser = async (survey: OnboardingSurvey): Promise<UserProfile> => {
  const r = getRedis();
  const id = `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const user: UserProfile = {
    id,
    name: survey.name,
    role: survey.role,
    workStyle: survey.workStyle,
    priorities: survey.priorities.join(', '),
    createdAt: new Date().toISOString(),
  };
  await r.set(USER_KEY(id), JSON.stringify(user));
  await r.sadd('users:all', id);
  return user;
};

export const getUser = async (userId: string): Promise<UserProfile | null> => {
  const r = getRedis();
  const data = await r.get(USER_KEY(userId));
  return data ? JSON.parse(data as string) : null;
};

export const seedScheduleFromSurvey = async (userId: string, survey: OnboardingSurvey): Promise<ScheduleEvent[]> => {
  const today = new Date().toISOString().split('T')[0];
  const events: ScheduleEvent[] = [];
  const colors = ['#6C5CE7', '#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#EF4444'];

  const wakeHour = parseInt(survey.wakeUpTime?.split(':')[0] || '8');
  let hour = wakeHour;

  events.push({
    id: 'evt_seed_1',
    title: '☕ Morning routine',
    start: `${String(hour).padStart(2, '0')}:00`,
    end: `${String(hour).padStart(2, '0')}:30`,
    date: today,
    color: colors[0],
  });
  hour++;

  if (survey.role === 'engineer' || survey.role === 'designer') {
    events.push({
      id: 'evt_seed_2',
      title: '💻 Deep focus work',
      start: `${String(hour).padStart(2, '0')}:00`,
      end: `${String(hour + 2).padStart(2, '0')}:00`,
      date: today,
      color: colors[1],
    });
    hour += 2;
  } else if (survey.role === 'pm' || survey.role === 'founder') {
    events.push({
      id: 'evt_seed_2',
      title: '📧 Email + Slack catch-up',
      start: `${String(hour).padStart(2, '0')}:00`,
      end: `${String(hour).padStart(2, '0')}:45`,
      date: today,
      color: colors[1],
    });
    hour++;
    events.push({
      id: 'evt_seed_3',
      title: '🤝 Team standup',
      start: `${String(hour).padStart(2, '0')}:00`,
      end: `${String(hour).padStart(2, '0')}:30`,
      date: today,
      color: colors[2],
    });
    hour++;
  } else {
    events.push({
      id: 'evt_seed_2',
      title: '📖 Study / Learning block',
      start: `${String(hour).padStart(2, '0')}:00`,
      end: `${String(hour + 1).padStart(2, '0')}:30`,
      date: today,
      color: colors[1],
    });
    hour += 2;
  }

  events.push({
    id: 'evt_seed_lunch',
    title: '🍽️ Lunch break',
    start: '12:00',
    end: '12:45',
    date: today,
    color: colors[3],
  });

  let pmHour = 13;
  if (survey.priorities.includes('deep work')) {
    events.push({
      id: 'evt_seed_pm1',
      title: '🎯 Focused project time',
      start: `${String(pmHour).padStart(2, '0')}:00`,
      end: `${String(pmHour + 2).padStart(2, '0')}:00`,
      date: today,
      color: colors[4],
    });
    pmHour += 2;
  }
  if (survey.priorities.includes('meetings')) {
    events.push({
      id: 'evt_seed_pm2',
      title: '📞 Meeting block',
      start: `${String(pmHour).padStart(2, '0')}:00`,
      end: `${String(pmHour + 1).padStart(2, '0')}:30`,
      date: today,
      color: colors[2],
    });
    pmHour += 2;
  }
  if (survey.priorities.includes('exercise')) {
    events.push({
      id: 'evt_seed_exercise',
      title: '🏃 Exercise / Movement',
      start: survey.workStyle === 'morning person' ? '06:30' : '17:00',
      end: survey.workStyle === 'morning person' ? '07:15' : '17:45',
      date: today,
      color: colors[5],
    });
  }
  if (survey.priorities.includes('creative')) {
    events.push({
      id: 'evt_seed_creative',
      title: '🎨 Creative / brainstorm time',
      start: `${String(pmHour).padStart(2, '0')}:00`,
      end: `${String(pmHour + 1).padStart(2, '0')}:00`,
      date: today,
      color: colors[0],
    });
  }

  events.push({
    id: 'evt_seed_eod',
    title: '📝 Wrap-up + plan tomorrow',
    start: '17:00',
    end: '17:30',
    date: today,
    color: colors[3],
  });

  for (const event of events) {
    await addEvent(userId, event);
  }

  return events;
};
