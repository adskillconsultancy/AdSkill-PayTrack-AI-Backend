import { AttendanceStatus, Prisma } from "@prisma/client";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import prisma from "../../lib/prisma";
import {
  TAttendanceFilters,
  TClockInPayload,
  TClockOutPayload,
  TUpdateFocusPayload,
} from "./attendance.interface";

const userSummarySelect = {
  id: true,
  name: true,
  preferredName: true,
  email: true,
  clientId: true,
  role: {
    select: {
      id: true,
      name: true,
    },
  },
};

/**
 * Normalizes any Date or YYYY-MM-DD string to start of day UTC Date
 */
const normalizeToStartOfDay = (dateInput?: string | Date): Date => {
  const d = dateInput ? new Date(dateInput) : new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

/**
 * 1. Clock In
 */
const clockIn = async (userId: string, payload: TClockInPayload) => {
  // Check if user already has an active clocked-in session
  const activeSession = await prisma.attendance.findFirst({
    where: {
      userId,
      status: AttendanceStatus.CLOCKED_IN,
      isDeleted: false,
    },
    include: {
      user: {
        select: userSummarySelect,
      },
    },
  });

  if (activeSession) {
    // If active session exists, update focus if provided and return active session
    if (payload.currentFocus && payload.currentFocus !== activeSession.currentFocus) {
      return prisma.attendance.update({
        where: { id: activeSession.id },
        data: { currentFocus: payload.currentFocus },
        include: { user: { select: userSummarySelect } },
      });
    }
    return activeSession;
  }

  const now = new Date();
  const workDate = normalizeToStartOfDay(now);

  return prisma.attendance.create({
    data: {
      userId,
      workDate,
      clockIn: now,
      status: AttendanceStatus.CLOCKED_IN,
      currentFocus: payload.currentFocus || null,
    },
    include: {
      user: {
        select: userSummarySelect,
      },
    },
  });
};

/**
 * 2. Clock Out with EOD notes
 */
const clockOut = async (userId: string, payload: TClockOutPayload) => {
  const activeSession = await prisma.attendance.findFirst({
    where: {
      userId,
      status: AttendanceStatus.CLOCKED_IN,
      isDeleted: false,
    },
  });

  if (!activeSession) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "No active clocked-in session found to clock out from.",
    );
  }

  const clockOutTime = new Date();
  const diffMs = clockOutTime.getTime() - activeSession.clockIn.getTime();
  const totalMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));

  return prisma.attendance.update({
    where: { id: activeSession.id },
    data: {
      clockOut: clockOutTime,
      totalMinutes,
      status: AttendanceStatus.CLOCKED_OUT,
      eodNotes: payload.eodNotes || activeSession.eodNotes,
    },
    include: {
      user: {
        select: userSummarySelect,
      },
    },
  });
};

/**
 * 3. Update Current Focus during an active shift
 */
const updateFocus = async (userId: string, payload: TUpdateFocusPayload) => {
  const activeSession = await prisma.attendance.findFirst({
    where: {
      userId,
      status: AttendanceStatus.CLOCKED_IN,
      isDeleted: false,
    },
  });

  if (!activeSession) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "No active session found. Please clock in first.",
    );
  }

  return prisma.attendance.update({
    where: { id: activeSession.id },
    data: {
      currentFocus: payload.currentFocus,
    },
    include: {
      user: {
        select: userSummarySelect,
      },
    },
  });
};

/**
 * 4. Get Current Status for Logged-In User
 */
const getCurrentStatus = async (userId: string) => {
  const activeSession = await prisma.attendance.findFirst({
    where: {
      userId,
      status: AttendanceStatus.CLOCKED_IN,
      isDeleted: false,
    },
    include: {
      user: {
        select: userSummarySelect,
      },
    },
  });

  const todayDate = normalizeToStartOfDay();
  const todayRecords = await prisma.attendance.findMany({
    where: {
      userId,
      workDate: todayDate,
      isDeleted: false,
    },
  });

  let totalMinutesToday = 0;
  for (const rec of todayRecords) {
    if (rec.totalMinutes) {
      totalMinutesToday += rec.totalMinutes;
    } else if (rec.status === AttendanceStatus.CLOCKED_IN) {
      const now = new Date();
      totalMinutesToday += Math.max(1, Math.round((now.getTime() - rec.clockIn.getTime()) / 60000));
    }
  }

  return {
    isClockedIn: !!activeSession,
    activeSession,
    totalMinutesToday,
  };
};

/**
 * 5. Get Personal Attendance History
 */
const getMyHistory = async (userId: string, filters: TAttendanceFilters) => {
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const skip = (page - 1) * limit;

  const where: Prisma.AttendanceWhereInput = {
    userId,
    isDeleted: false,
  };

  if (filters.startDate || filters.endDate) {
    where.workDate = {};
    if (filters.startDate) {
      where.workDate.gte = normalizeToStartOfDay(filters.startDate);
    }
    if (filters.endDate) {
      where.workDate.lte = normalizeToStartOfDay(filters.endDate);
    }
  }

  if (filters.status && Object.values(AttendanceStatus).includes(filters.status as AttendanceStatus)) {
    where.status = filters.status as AttendanceStatus;
  }

  const [items, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      orderBy: { clockIn: "desc" },
      skip,
      take: limit,
      include: {
        user: {
          select: userSummarySelect,
        },
      },
    }),
    prisma.attendance.count({ where }),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    data: items,
  };
};

/**
 * 6. Get Team Attendance (Super Admin / Manager with Attendance Read All)
 */
const getTeamAttendance = async (filters: TAttendanceFilters) => {
  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 10;
  const skip = (page - 1) * limit;

  const where: Prisma.AttendanceWhereInput = {
    isDeleted: false,
  };

  if (filters.userId) {
    where.userId = filters.userId;
  }

  if (filters.roleId) {
    where.user = {
      roleId: filters.roleId,
    };
  }

  if (filters.status && Object.values(AttendanceStatus).includes(filters.status as AttendanceStatus)) {
    where.status = filters.status as AttendanceStatus;
  }

  if (filters.startDate || filters.endDate) {
    where.workDate = {};
    if (filters.startDate) {
      where.workDate.gte = normalizeToStartOfDay(filters.startDate);
    }
    if (filters.endDate) {
      where.workDate.lte = normalizeToStartOfDay(filters.endDate);
    }
  }

  if (filters.searchTerm) {
    const term = filters.searchTerm.trim();
    where.OR = [
      { user: { name: { contains: term, mode: "insensitive" } } },
      { user: { email: { contains: term, mode: "insensitive" } } },
      { currentFocus: { contains: term, mode: "insensitive" } },
      { eodNotes: { contains: term, mode: "insensitive" } },
    ];
  }

  // Sorting
  const sortBy = filters.sortBy || "clockIn";
  const sortOrder = filters.sortOrder || "desc";
  const orderBy: Prisma.AttendanceOrderByWithRelationInput = {
    [sortBy]: sortOrder,
  };

  const todayDate = normalizeToStartOfDay();

  const [items, total, currentlyActiveCount, activeUsersTodayCount, todayRecords] = await Promise.all([
    prisma.attendance.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        user: {
          select: userSummarySelect,
        },
      },
    }),
    prisma.attendance.count({ where }),
    // Realtime currently active
    prisma.attendance.count({
      where: {
        status: AttendanceStatus.CLOCKED_IN,
        isDeleted: false,
      },
    }),
    // Unique users active today
    prisma.attendance.groupBy({
      by: ["userId"],
      where: {
        workDate: todayDate,
        isDeleted: false,
      },
    }).then((res) => res.length),
    // Today records for total hours
    prisma.attendance.findMany({
      where: {
        workDate: todayDate,
        isDeleted: false,
      },
      select: {
        clockIn: true,
        clockOut: true,
        totalMinutes: true,
        status: true,
      },
    }),
  ]);

  let totalMinutesToday = 0;
  const now = new Date();
  for (const r of todayRecords) {
    if (r.totalMinutes) {
      totalMinutesToday += r.totalMinutes;
    } else if (r.status === AttendanceStatus.CLOCKED_IN) {
      totalMinutesToday += Math.max(1, Math.round((now.getTime() - r.clockIn.getTime()) / 60000));
    }
  }

  const totalHoursToday = Number((totalMinutesToday / 60).toFixed(1));

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    metrics: {
      currentlyActiveCount,
      activeUsersTodayCount,
      totalHoursToday,
    },
    data: items,
  };
};


export const AttendanceService = {
  clockIn,
  clockOut,
  updateFocus,
  getCurrentStatus,
  getMyHistory,
  getTeamAttendance,
};
