const express = require("express");


const {
    getVectors,
    insertVector,
    searchVectors,
    benchmarkSearch
} = require("../controllers/vector.controller");

const router = express.Router();


const validate =
    require("../middleware/validate");

const {
    insertVectorSchema
} = require("../validators/vector.validator");



/**
 * @swagger
 * /api/vectors:
 *   get:
 *     summary: Get all vectors
 *     description: Returns all vectors stored in the Vector Database.
 *     tags:
 *       - Vectors
 *     responses:
 *       200:
 *         description: Successfully fetched vectors.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               count: 4
 *               data:
 *                 - id: vector-1
 *                   values:
 *                     - 0.1
 *                     - 0.2
 *                     - 0.3
 *                   metadata:
 *                     category: AI
 */
router.get("/", getVectors);


/**
 * @swagger
 * /api/vectors:
 *   post:
 *     summary: Insert a new vector
 *     description: Inserts a vector into the Vector Database.
 *     tags:
 *       - Vectors
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Vector'
 *     responses:
 *       201:
 *         description: Vector inserted successfully.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Vector inserted successfully.
 */
router.post(
    "/",
    validate(insertVectorSchema),
    insertVector
);



/**
 * @swagger
 * /api/vectors/search:
 *   post:
 *     summary: Search similar vectors
 *     description: Performs Top-K vector similarity search using Brute Force, KD-Tree or HNSW.
 *     tags:
 *       - Vectors
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             vector:
 *               - 0.12
 *               - 0.23
 *               - 0.34
 *             k: 5
 *             metric: cosine
 *             algorithm: kd-tree
 *     responses:
 *       200:
 *         description: Search completed successfully.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               algorithm: kd-tree
 *               count: 5
 *               data: []
 */
router.post("/search", searchVectors);


/**
 * @swagger
 * /api/vectors/benchmark:
 *   get:
 *     summary: Benchmark algorithms
 *     description: Compares Brute Force, KD-Tree and HNSW execution times.
 *     tags:
 *       - Benchmark
 *     responses:
 *       200:
 *         description: Benchmark completed successfully.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               datasetSize: 10000
 *               results:
 *                 bruteForce:
 *                   averageExecutionTime: "4.54 ms"
 *                 kdTree:
 *                   averageExecutionTime: "4.14 ms"
 *                 hnsw:
 *                   averageExecutionTime: "3.39 ms"
 *               runs: 1000
 */



router.get(
    "/benchmark",
    benchmarkSearch
);

module.exports = router;


