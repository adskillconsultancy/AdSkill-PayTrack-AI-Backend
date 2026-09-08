import { Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import { TErrorSource, TGenericErrorResponse } from '../interface/error';

const handlePrismaError = (
  err: Prisma.PrismaClientKnownRequestError,
): TGenericErrorResponse => {
  let statusCode: number = httpStatus.BAD_REQUEST;
  let message = 'Database Error';
  let errorSources: TErrorSource[] = [];

  switch (err.code) {
    // Unique constraint failed
    case 'P2002': {
      const target = err.meta?.target;
      const field = Array.isArray(target)
        ? target.join(', ')
        : typeof target === 'string'
        ? target
        : 'field';
      statusCode = httpStatus.CONFLICT;
      message = 'Duplicate Record';
      errorSources = [
        {
          path: field,
          message: `${field} already exists`,
        },
      ];
      break;
    }

    // Foreign key constraint failed
    case 'P2003': {
      const field = (err.meta?.field_name as string) || 'field';
      statusCode = httpStatus.BAD_REQUEST;
      message = 'Foreign Key Constraint Violation';
      errorSources = [
        {
          path: field,
          message: `Referenced entity in ${field} does not exist`,
        },
      ];
      break;
    }

    // Record not found
    case 'P2025': {
      statusCode = httpStatus.NOT_FOUND;
      message = 'Record Not Found';
      errorSources = [
        {
          path: '',
          message:
            (err.meta?.cause as string) || 'The requested record does not exist',
        },
      ];
      break;
    }

    default: {
      errorSources = [
        {
          path: '',
          message: err.message,
        },
      ];
    }
  }

  return {
    statusCode,
    message,
    errorSources,
  };
};

export default handlePrismaError;
