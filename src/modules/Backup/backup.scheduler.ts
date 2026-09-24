import { runDatabaseBackup } from "./backup.service";

/**
 * Schedules a database backup to Cloudflare R2 every night at 12:00 AM (midnight).
 * Uses native Node timers with zero extra dependencies.
 */
export const scheduleDailyMidnightBackup = () => {
  const scheduleNextRun = () => {
    const now = new Date();
    const nextMidnight = new Date();
    // Set to 00:00:00 of the following day
    nextMidnight.setDate(nextMidnight.getDate() + 1);
    nextMidnight.setHours(0, 0, 0, 0);

    const msUntilMidnight = nextMidnight.getTime() - now.getTime();
    const hoursRemaining = (msUntilMidnight / (1000 * 60 * 60)).toFixed(1);

    console.log(
      `🕒 [BackupScheduler] Next automated midnight backup scheduled in ~${hoursRemaining} hours (at 00:00:00).`,
    );

    setTimeout(async () => {
      console.log(
        "🌙 [BackupScheduler] It is 12:00 AM midnight. Starting scheduled database backup to Cloudflare R2...",
      );
      try {
        const result = await runDatabaseBackup();
        console.log(
          `✅ [BackupScheduler] Midnight backup succeeded: ${result.key} (${result.compressedSize})`,
        );
      } catch (error) {
        console.error("❌ [BackupScheduler] Midnight backup failed:", error);
      }
      // Re-schedule for next midnight
      scheduleNextRun();
    }, msUntilMidnight);
  };

  scheduleNextRun();
};
