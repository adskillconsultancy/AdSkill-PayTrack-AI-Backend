export type TAuthUser = {
  id: string;
  email: string;
  role: string;
  roleId?: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: TAuthUser;
    }
  }
}
