import { Router, type IRouter } from "express";
import healthRouter from "./health";
import aiRouter from "./ai";
import ideasRouter from "./ideas";
import videoRouter from "./video";

const router: IRouter = Router();

router.use(healthRouter);
router.use(aiRouter);
router.use(ideasRouter);
router.use(videoRouter);

export default router;
