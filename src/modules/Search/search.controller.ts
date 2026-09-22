import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { SearchService } from "./search.service";

const omniSearch = catchAsync(async (req: Request, res: Response) => {
  const query = (req.query.q || req.query.searchTerm || "") as string;
  const actorUserId = req.user?.id;
  const userRole = req.user?.role;

  const result = await SearchService.omniSearch(query, actorUserId, userRole);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Search results retrieved successfully",
    data: result,
  });
});

export const SearchController = {
  omniSearch,
};
