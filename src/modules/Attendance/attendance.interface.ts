export type TClockInPayload = {
  currentFocus?: string;
};

export type TClockOutPayload = {
  eodNotes?: string;
};

export type TUpdateFocusPayload = {
  currentFocus: string;
};

export type TAttendanceFilters = {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  userId?: string;
  roleId?: string;
  status?: string;
  searchTerm?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};
