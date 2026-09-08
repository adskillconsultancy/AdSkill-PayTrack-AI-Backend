import { RequestHandler } from 'express';
import httpStatus from 'http-status';

const notFound: RequestHandler = (req, res) => {
  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
    errorSources: [
      {
        path: req.originalUrl,
        message: 'The requested API endpoint does not exist',
      },
    ],
  });
};

export default notFound;
