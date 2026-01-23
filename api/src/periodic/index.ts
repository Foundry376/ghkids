import { addDays, addHours, format, getUnixTime, isPast } from "date-fns";
import { tz } from "@date-fns/tz";
import { deliverPlaySummaries } from "./play-summaries";
import { deliverAnnouncements } from "./announcements";

const ONE_MIN = 60 * 1000;
const DAYLIGHT_TIMEZONE = "America/Los_Angeles";

function midnightInTimezone(timezone: string): Date {
  const now = new Date();
  const formatted = format(now, "yyyy-MM-dd", { in: tz(timezone) });
  return new Date(`${formatted}T00:00:00`);
}

async function recordDurationMetric<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  const start = Date.now();
  try {
    return await fn();
  } finally {
    const duration = Date.now() - start;
    console.log(`[Periodic] ${label} completed in ${duration}ms`);
  }
}

export function setIntervalEnsureSerialExecution(
  fn: () => Promise<void>,
  interval: number
): void {
  let running = false;
  setInterval(async () => {
    if (running === true) {
      console.log(
        `skipping setInterval invocation, ${fn.name} is still running after ${interval}ms`
      );
      return;
    }
    try {
      running = true;
      await fn();
      running = false;
    } catch (err) {
      running = false;
      console.error(`[Periodic] Error in ${fn.name}:`, err);
    }
  }, interval);
}

export function setupRecurringTasks(
  intervalDescription: string,
  initial: Date,
  scheduleNext: (date: Date) => Date,
  taskFns: (() => Promise<unknown>)[]
): void {
  let nextFire = initial;
  if (isPast(nextFire)) {
    nextFire = scheduleNext(nextFire);
  }

  // Note: You can't setTimeout for "one month from now" because the time delay
  // in ms exceeds the max size of a 32-bit signed integer. This is mindblowingly
  // stupid, so we just check every 5 minutes to see if our intended time has been
  // reached.

  setIntervalEnsureSerialExecution(async () => {
    if (isPast(nextFire)) {
      nextFire = scheduleNext(nextFire);
      for (const fn of taskFns) {
        try {
          console.log(`[Periodic][${intervalDescription}]: ${fn.name} started`);
          await recordDurationMetric(fn, fn.name);
          console.log(
            `[Periodic][${intervalDescription}]: ${fn.name} finished`
          );
        } catch (err) {
          console.error(
            `[Periodic][${intervalDescription}]: ${fn.name} failed:`,
            err
          );
        }
      }
    }
  }, 5 * ONE_MIN);

  const formatted = format(nextFire, "EEEE, MMMM d, yyyy h:mm aaaa", {
    in: tz(DAYLIGHT_TIMEZONE),
  });

  console.log(
    `[Periodic] ${intervalDescription} tasks (${taskFns.length}) scheduled for ${formatted} ${DAYLIGHT_TIMEZONE} (${getUnixTime(nextFire)})`
  );
}

export function startPeriodicTasks(): void {
  console.log("[Periodic] Starting periodic tasks...");

  // Weekly play summaries - every Monday at 9am PT
  setupRecurringTasks(
    `9am weekly ${DAYLIGHT_TIMEZONE}`,
    addHours(addDays(midnightInTimezone(DAYLIGHT_TIMEZONE), (8 - new Date().getDay()) % 7), 9),
    (date) => addDays(date, 7),
    [deliverPlaySummaries]
  );

  // Daily announcements check - 10am PT
  setupRecurringTasks(
    `10am daily ${DAYLIGHT_TIMEZONE}`,
    addHours(midnightInTimezone(DAYLIGHT_TIMEZONE), 10),
    (date) => addDays(date, 1),
    [deliverAnnouncements]
  );
}
