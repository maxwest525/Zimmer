import { Router, type IRouter } from "express";
import healthRouter from "./health";
import aiRouter from "./ai";
import ideasRouter from "./ideas";
import videoRouter from "./video";
import skillsRouter from "./skills";
import mcpRouter from "./mcp";

const router: IRouter = Router();

router.use(healthRouter);
router.use(aiRouter);
router.use(ideasRouter);
router.use(videoRouter);
router.use(skillsRouter);
router.use(mcpRouter);

export default router;
