import { Router, type IRouter } from "express";
import healthRouter from "./health";
import aiRouter from "./ai";
import ideasRouter from "./ideas";
import videoRouter from "./video";
import skillsRouter from "./skills";
import mcpRouter from "./mcp";
import projectsRouter from "./projects";
import workflowsRouter from "./workflows";

const router: IRouter = Router();

router.use(healthRouter);
router.use(aiRouter);
router.use(ideasRouter);
router.use(videoRouter);
router.use(skillsRouter);
router.use(mcpRouter);
router.use(projectsRouter);
router.use(workflowsRouter);

export default router;
