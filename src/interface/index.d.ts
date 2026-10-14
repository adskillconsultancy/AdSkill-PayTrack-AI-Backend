export type TAuthUser = {
  id: string;
  email: string;
  name?: string;
  role: string;
  roleId?: string;
  permissions?: string[];
};

declare global {
  namespace Express {
    interface Request {
      user?: TAuthUser;
    }
  }
}
