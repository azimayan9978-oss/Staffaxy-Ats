import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import clientsRouter from "./clients";
import positionsRouter from "./positions";
import candidatesRouter from "./candidates";
import notesRouter from "./notes";
import filesRouter from "./files";
import dashboardRouter from "./dashboard";
import auditRouter from "./audit";
import notificationsRouter from "./notifications";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(clientsRouter);
router.use(positionsRouter);
router.use(candidatesRouter);
router.use(notesRouter);
router.use(filesRouter);
router.use(dashboardRouter);
router.use(auditRouter);
router.use(notificationsRouter);
router.use(reportsRouter);

export default router;
