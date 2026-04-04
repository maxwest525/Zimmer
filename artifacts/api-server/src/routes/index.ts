import { Router, type IRouter } from "express";
import healthRouter from "./health";
import aiRouter from "./ai";
import ideasRouter from "./ideas";

const router: IRouter = Router();

router.use(healthRouter);
router.use(aiRouter);
router.use(ideasRouter);

export default router;
