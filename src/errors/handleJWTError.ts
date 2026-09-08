import httpStatus from 'http-status';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { TGenericErrorResponse } from '../interface/error';

export const handleJWTError = (
  err: JsonWebTokenError | TokenExpiredError,
): TGenericErrorResponse => {
  if (err instanceof TokenExpiredError) {
    return {
      statusCode: httpStatus.UNAUTHORIZED,
      message: 'Token Expired',
      errorSources: [
        {
          path: '',
          message: 'Your authentication token has expired. Please log in again.',
        },
      ],
    };
  }

  return {
    statusCode: httpStatus.UNAUTHORIZED,
    message: 'Invalid Token',
    errorSources: [
      {
        path: '',
        message: 'The provided authentication token is invalid or malformed.',
      },
    ],
  };
};
