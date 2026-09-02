import { Router, type IRouter } from "express";
import healthRouter from "./health";
import garageRouter from "./garage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(garageRouter);

export default router;
