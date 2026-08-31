import { Router, type IRouter } from "express";
import healthRouter from "./health";
import attritionRouter from "./attrition";

const router: IRouter = Router();

router.use(healthRouter);
router.use(attritionRouter);

export default router;
