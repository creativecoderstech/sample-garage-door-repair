import { Router, type IRouter } from "express";
import healthRouter from "./health";
import garageRouter from "./garage";
import transcribeRouter from "./transcribe";

const router: IRouter = Router();

router.use(healthRouter);
router.use(transcribeRouter);
router.use(garageRouter);

export default router;
