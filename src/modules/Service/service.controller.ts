import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { serviceFilterableFields } from "./service.constant";
import { ServiceService } from "./service.service";

const createService = catchAsync(async (req: Request, res: Response) => {
  const actorId = req.user!.id;
  const result = await ServiceService.createService(req.body, actorId);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Service offering created successfully",
    data: result,
  });
});

const getAllServices = catchAsync(async (req: Request, res: Response) => {
  const filters = Object.fromEntries(
    Object.entries(req.query).filter(([key]) =>
      serviceFilterableFields.includes(key),
    ),
  );

  const paginationOptions = {
    page: req.query.page as string | undefined,
    limit: req.query.limit as string | undefined,
  };

  const sortOptions = {
    sortBy: req.query.sortBy as string | undefined,
    sortOrder: req.query.sortOrder as string | undefined,
  };

  const result = await ServiceService.getAllServices(
    filters,
    paginationOptions,
    sortOptions,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Services retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getServiceById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ServiceService.getServiceById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Service retrieved successfully",
    data: result,
  });
});

const updateService = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const actorId = req.user!.id;
  const result = await ServiceService.updateService(id, req.body, actorId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Service updated successfully",
    data: result,
  });
});

const deleteService = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const actorId = req.user!.id;
  const result = await ServiceService.deleteService(id, actorId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Service soft deleted successfully",
    data: result,
  });
});

export const ServiceController = {
  createService,
  getAllServices,
  getServiceById,
  updateService,
  deleteService,
};
