import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { Router, type IRouter } from "express";
import {
  GetDashboardResponse,
  GetModelMetricsResponse,
  PredictAttritionBody,
  PredictAttritionResponse,
} from "@workspace/api-zod";

const execFileAsync = promisify(execFile);
const router: IRouter = Router();
const root = process.cwd();
const modelDirCandidates = [
  path.join(root, "backend", "models"),
  path.resolve(root, "..", "..", "backend", "models"),
];
const modelsDir = modelDirCandidates.find((candidate) => existsSync(candidate)) ?? modelDirCandidates[0];
const statsPath = path.join(modelsDir, "dataset_stats.json");
const metricsPath = path.join(modelsDir, "metrics.json");
const modelPath = path.join(modelsDir, "attrition_model.pkl");
const predictScriptPath = path.resolve(modelsDir, "..", "predict_cli.py");

function readJson<T>(filePath: string, parser: { parse: (value: unknown) => T }): T {
  if (!existsSync(filePath)) {
    throw new Error("Model artifacts are missing. Run `python backend/train_model.py` first.");
  }
  return parser.parse(JSON.parse(readFileSync(filePath, "utf8")));
}

router.get("/dashboard", (_req, res) => {
  try {
    res.json(readJson(statsPath, GetDashboardResponse));
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "Dashboard unavailable" });
  }
});

router.get("/model-metrics", (_req, res) => {
  try {
    res.json(readJson(metricsPath, GetModelMetricsResponse));
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "Model metrics unavailable" });
  }
});

router.post("/predict", async (req, res) => {
  const parsed = PredictAttritionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Please check the employee information and try again.",
      details: parsed.error.flatten(),
    });
    return;
  }
  if (!existsSync(modelPath)) {
    res.status(503).json({ error: "Model artifacts are missing. Run `python backend/train_model.py` first." });
    return;
  }

  try {
    const { stdout } = await execFileAsync("python", [
      predictScriptPath,
      JSON.stringify(parsed.data),
    ], { maxBuffer: 1024 * 1024 });
    const prediction = PredictAttritionResponse.parse(JSON.parse(stdout));
    res.json(prediction);
  } catch (error) {
    req.log.error({ err: error }, "Prediction failed");
    res.status(500).json({ error: "The prediction service could not process this employee." });
  }
});

export default router;