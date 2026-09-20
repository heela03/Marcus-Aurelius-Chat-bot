import { Router, type IRouter } from "express";
import healthRouter from "./health";
import counselRouter from "./counsel";

const router: IRouter = Router();

router.use(healthRouter);
router.use(counselRouter);

export default router;
