import { TDashboardPeriod } from "./dashboard.interface";

export const DASHBOARD_PERIODS: TDashboardPeriod[] = [
  "today",
  "yesterday",
  "7d",
  "30d",
  "this_month",
  "custom",
];

export interface TDateRange {
  startDate: Date;
  endDate: Date;
  previousStartDate: Date;
  previousEndDate: Date;
}

/**
 * Calculates start and end timestamps for the selected period along with
 * an equivalent previous window for period-over-period percentage comparisons.
 */
export const getDateRangeForPeriod = (
  period: TDashboardPeriod = "30d",
  customStart?: string,
  customEnd?: string,
): TDateRange => {
  const now = new Date();

  // End of current day UTC
  const endOfToday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );

  // Start of current day UTC
  const startOfToday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );

  let startDate: Date;
  let endDate: Date = endOfToday;
  let previousStartDate: Date;
  let previousEndDate: Date;

  switch (period) {
    case "today": {
      startDate = startOfToday;
      endDate = endOfToday;

      // Previous period: yesterday
      previousStartDate = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
      previousEndDate = new Date(endOfToday.getTime() - 24 * 60 * 60 * 1000);
      break;
    }
    case "yesterday": {
      startDate = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
      endDate = new Date(endOfToday.getTime() - 24 * 60 * 60 * 1000);

      // Previous period: 2 days ago
      previousStartDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
      previousEndDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
      break;
    }
    case "7d": {
      startDate = new Date(startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000);
      endDate = endOfToday;

      const duration = endDate.getTime() - startDate.getTime();
      previousEndDate = new Date(startDate.getTime() - 1);
      previousStartDate = new Date(previousEndDate.getTime() - duration);
      break;
    }
    case "this_month": {
      startDate = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
      );
      endDate = endOfToday;

      // Previous month
      previousStartDate = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0),
      );
      previousEndDate = new Date(startDate.getTime() - 1);
      break;
    }
    case "custom": {
      if (customStart) {
        startDate = new Date(`${customStart}T00:00:00.000Z`);
      } else {
        startDate = new Date(startOfToday.getTime() - 29 * 24 * 60 * 60 * 1000);
      }

      if (customEnd) {
        endDate = new Date(`${customEnd}T23:59:59.999Z`);
      } else {
        endDate = endOfToday;
      }

      const duration = endDate.getTime() - startDate.getTime();
      previousEndDate = new Date(startDate.getTime() - 1);
      previousStartDate = new Date(previousEndDate.getTime() - duration);
      break;
    }
    case "30d":
    default: {
      startDate = new Date(startOfToday.getTime() - 29 * 24 * 60 * 60 * 1000);
      endDate = endOfToday;

      const duration = endDate.getTime() - startDate.getTime();
      previousEndDate = new Date(startDate.getTime() - 1);
      previousStartDate = new Date(previousEndDate.getTime() - duration);
      break;
    }
  }

  return {
    startDate,
    endDate,
    previousStartDate,
    previousEndDate,
  };
};
