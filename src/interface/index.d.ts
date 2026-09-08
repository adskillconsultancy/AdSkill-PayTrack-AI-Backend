import { UserRole } from '@prisma/client';

export type TAuthUser = {
  id: string;
  email: string;
  role: UserRole;
};

declare global {
  namespace Express {
    interface Request {
      user?: TAuthUser;
    }
  }
}
