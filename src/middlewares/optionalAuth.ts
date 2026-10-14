import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import config from "../config";
import { TAuthUser } from "../interface";
import prisma from "../lib/prisma";

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      token = authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : authHeader;
    } else if (req.query?.token && typeof req.query.token === "string") {
      token = req.query.token;
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(
      token,
      config.jwt.access_secret as string,
    ) as JwtPayload & TAuthUser & { pendingMfa?: boolean; type?: string };

    if (decoded.pendingMfa || decoded.type === "PASSWORD_RESET") {
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { role: true },
    });

    if (user && !user.isDeleted && user.status === "ACTIVE") {
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
        roleId: user.roleId,
        permissions: [],
      };
    }
  } catch (_error) {
    // Silently ignore invalid or expired tokens in optionalAuth
  }

  next();
};
