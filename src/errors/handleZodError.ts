import { ZodError, ZodIssue } from 'zod';
import httpStatus from 'http-status';
import { TErrorSource, TGenericErrorResponse } from '../interface/error';

const handleZodError = (err: ZodError): TGenericErrorResponse => {
  const errorSources: TErrorSource[] = err.issues.map((issue: ZodIssue) => {
    return {
      path: issue.path[issue.path.length - 1] ?? '',
      message: issue.message,
    };
  });

  return {
    statusCode: httpStatus.BAD_REQUEST,
    message: 'Validation Error',
    errorSources,
  };
};

export default handleZodError;
