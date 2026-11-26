import { Router } from "express";
import { searchProducts } from "../lib/productCatalog";
import { logger } from "../lib/logger";

export const productsRouter = Router();

productsRouter.get("/", async (req, res) => {
  const { q = "", category, page = "1", pageSize = "20" } = req.query;
  if (typeof q !== "string" || q.length > 200 ||
      (category !== undefined && (typeof category !== "string" || category.length > 200)) ||
      typeof page !== "string" || !/^[1-9]\d*$/.test(page) || Number(page) > 1000 ||
      typeof pageSize !== "string" || !/^[1-9]\d*$/.test(pageSize) || Number(pageSize) > 100 ||
      Number(page) * Number(pageSize) > 10000) {
    return res.status(422).json({ error: "validation_failed", fields: { query: "Use q/category strings, page 1–1000 and pageSize 1–100, within the first 10,000 results" } });
  }
  try {
    return res.json(await searchProducts(q.trim(), category, Number(page), Number(pageSize)));
  } catch (err) {
    logger.error({ err }, "Product catalog search failed");
    return res.status(503).json({ error: "catalog_unavailable" });
  }
});
