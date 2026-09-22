import { Router } from "express";
import auth from "../../middlewares/auth";
import { SearchController } from "./search.controller";

const router = Router();

// Any authenticated user can search within their authorized scope
router.get("/", auth(), SearchController.omniSearch);

export const SearchRoutes = router;
