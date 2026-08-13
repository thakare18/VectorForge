const VectorDB = require("../database/vector.database");
const sampleData = require("../data/sampleData");
const benchmarkData = require("../data/benchmarkData");

const {
    successResponse,
    errorResponse
} = require("../utils/response");

const {
    saveVector,
    loadVectors,
    deleteVector,
    clearVectors
} = require("../services/vector.persistence.service");

const userDatabases = new Map();

const getUserDatabase = async (userId) => {
    const key = userId.toString();

    if (userDatabases.has(key)) {
        return userDatabases.get(key);
    }

    const database = new VectorDB();

    const vectors = await loadVectors(userId);

    for (const vector of vectors) {
        database.insert({
            id: vector.vectorId,
            values: vector.values,
            metadata: vector.metadata || {}
        });
    }

    if (vectors.length > 0) {
        database.buildKDTree();
    }

    userDatabases.set(key, database);

    return database;
};

const getVectors = async (req, res) => {
    try {
        const userId = req.user._id;

        const database =
            await getUserDatabase(userId);

        const totalVectors =
            database.size();

        res.status(200).json({
            success: true,

            statistics: {
                totalVectors,
                totalChunks: totalVectors,
                embeddingModel: "text-embedding-004",
                searchAlgorithm: "Brute Force",
                similarityMetric: "Cosine Similarity"
            },

            recentUploads: [
                {
                    name: "Current Session",
                    chunks: totalVectors
                }
            ],

            data: database.getAll()
        });

    } catch (error) {
        console.error(
            "Get vectors error:",
            error
        );

        return errorResponse(
            res,
            500,
            "Failed to load vectors."
        );
    }
};

const insertVector = async (req, res) => {
    try {
        const userId = req.user._id;

        const {
            id,
            values,
            metadata
        } = req.body;

        if (
            !id ||
            !Array.isArray(values)
        ) {
            return res.status(400).json({
                success: false,
                message: "id and values are required."
            });
        }

        const database =
            await getUserDatabase(userId);

        database.insert({
            id,
            values,
            metadata: metadata || {}
        });

        await saveVector(
            {
                id,
                values,
                metadata: metadata || {}
            },
            userId
        );

        database.buildKDTree();

        return successResponse(
            res,
            201,
            "Vector inserted successfully."
        );

    } catch (error) {
        console.error(
            "Insert vector error:",
            error
        );

        return errorResponse(
            res,
            500,
            "Failed to insert vector."
        );
    }
};

const deleteVectorById = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        if (!id) {
            return errorResponse(
                res,
                400,
                "Vector id is required."
            );
        }

        const database =
            await getUserDatabase(userId);

        const deleted =
            await deleteVector(id, userId);

        if (deleted.deletedCount === 0) {
            return errorResponse(
                res,
                404,
                "Vector not found."
            );
        }

        database.delete(id);

        return successResponse(
            res,
            200,
            "Vector deleted successfully."
        );

    } catch (error) {
        console.error(
            "Delete vector error:",
            error
        );

        return errorResponse(
            res,
            500,
            "Failed to delete vector."
        );
    }
};


const clearUserVectors = async (req, res) => {
    try {
        const userId = req.user._id;

        const database =
            await getUserDatabase(userId);

        await clearVectors(userId);

        database.clear();

        return successResponse(
            res,
            200,
            "All vectors cleared successfully."
        );

    } catch (error) {
        console.error(
            "Clear vectors error:",
            error
        );

        return errorResponse(
            res,
            500,
            "Failed to clear vectors."
        );
    }
};

const searchVectors = async (req, res) => {
    try {
        const userId = req.user._id;

        const {
            vector,
            k = 5,
            metric = "cosine",
            algorithm = "brute-force",
            includeTrace = false
        } = req.body;

        if (!Array.isArray(vector)) {
            return errorResponse(
                res,
                400,
                "Vector must be an array."
            );
        }

        const database =
            await getUserDatabase(userId);

        const withTrace =
            Boolean(includeTrace);

        const output =
            database.search(
                vector,
                k,
                metric,
                algorithm,
                withTrace
            );

        const results =
            withTrace
                ? output.results
                : output;

        const trace =
            withTrace
                ? output.trace
                : undefined;

        const response = {
            success: true,
            algorithm,
            count: results.length,
            data: results
        };

        if (trace) {
            response.trace = trace;
        }

        res.status(200).json(response);

    } catch (error) {
        console.error(
            "Search vectors error:",
            error
        );

        return errorResponse(
            res,
            500,
            "Failed to search vectors."
        );
    }
};

const benchmarkSearch = (req, res) => {

    const database =
        new VectorDB();

    database.clear();

    benchmarkData.forEach(
        (vector) => {
            database.insert(vector);
        }
    );

    database.buildKDTree();

    const dataset =
        database.getAll();

    if (dataset.length === 0) {
        return errorResponse(
            res,
            400,
            "Benchmark dataset is empty."
        );
    }

    const k = Math.min(
        5,
        dataset.length
    );

    const metric = "euclidean";

    const queryCount =
        Math.min(
            20,
            dataset.length
        );

    const runs = 100;
    const warmupRuns = 5;

    const queryVectors =
        dataset.slice(
            0,
            queryCount
        );

    const calculateRecall = (
        expected,
        actual
    ) => {

        if (
            expected.length === 0
        ) {
            return 0;
        }

        const expectedIds =
            new Set(
                expected.map(
                    vector => vector.id
                )
            );

        const matches =
            actual.filter(
                vector =>
                    expectedIds.has(
                        vector.id
                    )
            ).length;

        return matches /
            expected.length;
    };

    const calculateMedian = (
        values
    ) => {

        if (
            values.length === 0
        ) {
            return 0;
        }

        const sorted =
            [...values].sort(
                (a, b) => a - b
            );

        const middle =
            Math.floor(
                sorted.length / 2
            );

        if (
            sorted.length % 2 === 0
        ) {
            return (
                sorted[middle - 1] +
                sorted[middle]
            ) / 2;
        }

        return sorted[middle];
    };

    const calculateStatistics = (
        values
    ) => {

        if (
            values.length === 0
        ) {
            return {
                average: 0,
                min: 0,
                max: 0,
                median: 0
            };
        }

        const total =
            values.reduce(
                (sum, value) =>
                    sum + value,
                0
            );

        return {
            average:
                total / values.length,

            min:
                Math.min(...values),

            max:
                Math.max(...values),

            median:
                calculateMedian(values)
        };
    };

    const groundTruths =
        queryVectors.map(
            query =>
                database.search(
                    query.values,
                    k,
                    metric,
                    "brute-force"
                )
        );

    const warmupAlgorithms = [
        "brute-force",
        "kd-tree",
        "hnsw"
    ];

    for (
        const algorithm of
        warmupAlgorithms
    ) {

        for (
            let run = 0;
            run < warmupRuns;
            run++
        ) {

            for (
                const query of
                queryVectors
            ) {

                if (
                    algorithm === "hnsw"
                ) {
                    database.search(
                        query,
                        k,
                        metric,
                        algorithm
                    );
                } else {
                    database.search(
                        query.values,
                        k,
                        metric,
                        algorithm
                    );
                }
            }
        }
    }

    const benchmarkAlgorithm = (
        algorithm
    ) => {

        const times = [];

        for (
            let run = 0;
            run < runs;
            run++
        ) {

            const start =
                process.hrtime.bigint();

            for (
                const query of
                queryVectors
            ) {

                if (
                    algorithm === "hnsw"
                ) {
                    database.search(
                        query,
                        k,
                        metric,
                        algorithm
                    );
                } else {
                    database.search(
                        query.values,
                        k,
                        metric,
                        algorithm
                    );
                }
            }

            const end =
                process.hrtime.bigint();

            const elapsed =
                Number(
                    end - start
                ) / 1000000;

            const averagePerQuery =
                elapsed /
                queryVectors.length;

            times.push(
                averagePerQuery
            );
        }

        return calculateStatistics(
            times
        );
    };

    const bruteStats =
        benchmarkAlgorithm(
            "brute-force"
        );

    const kdStats =
        benchmarkAlgorithm(
            "kd-tree"
        );

    const hnswStats =
        benchmarkAlgorithm(
            "hnsw"
        );

    const kdRecalls = [];
    const hnswRecalls = [];

    for (
        let i = 0;
        i < queryVectors.length;
        i++
    ) {

        const query =
            queryVectors[i];

        const groundTruth =
            groundTruths[i];

        const kdResults =
            database.search(
                query.values,
                k,
                metric,
                "kd-tree"
            );

        const hnswResults =
            database.search(
                query,
                k,
                metric,
                "hnsw"
            );

        kdRecalls.push(
            calculateRecall(
                groundTruth,
                kdResults
            )
        );

        hnswRecalls.push(
            calculateRecall(
                groundTruth,
                hnswResults
            )
        );
    }

    const averageRecall = (
        values
    ) => {

        if (
            values.length === 0
        ) {
            return 0;
        }

        return values.reduce(
            (sum, value) =>
                sum + value,
            0
        ) / values.length;
    };

    const kdRecall =
        averageRecall(
            kdRecalls
        );

    const hnswRecall =
        averageRecall(
            hnswRecalls
        );

    const algorithms = {
        bruteForce:
            bruteStats.average,

        kdTree:
            kdStats.average,

        hnsw:
            hnswStats.average
    };

    const fastest =
        Object.entries(
            algorithms
        ).sort(
            (first, second) =>
                first[1] - second[1]
        )[0];

    const fastestAlgorithm =
        fastest[0];

    const fastestTime =
        fastest[1];

    const speedImprovement =
        algorithms.bruteForce /
        fastestTime;

    res.status(200).json({

        success: true,

        datasetSize:
            dataset.length,

        queryCount,

        k,

        metric,

        runs,

        warmupRuns,

        results: {

            bruteForce: {

                averageExecutionTime:
                    `${bruteStats.average.toFixed(6)} ms`,

                minExecutionTime:
                    `${bruteStats.min.toFixed(6)} ms`,

                maxExecutionTime:
                    `${bruteStats.max.toFixed(6)} ms`,

                medianExecutionTime:
                    `${bruteStats.median.toFixed(6)} ms`,

                recall:
                    "100.00%"
            },

            kdTree: {

                averageExecutionTime:
                    `${kdStats.average.toFixed(6)} ms`,

                minExecutionTime:
                    `${kdStats.min.toFixed(6)} ms`,

                maxExecutionTime:
                    `${kdStats.max.toFixed(6)} ms`,

                medianExecutionTime:
                    `${kdStats.median.toFixed(6)} ms`,

                recall:
                    `${(
                        kdRecall * 100
                    ).toFixed(2)}%`
            },

            hnsw: {

                averageExecutionTime:
                    `${hnswStats.average.toFixed(6)} ms`,

                minExecutionTime:
                    `${hnswStats.min.toFixed(6)} ms`,

                maxExecutionTime:
                    `${hnswStats.max.toFixed(6)} ms`,

                medianExecutionTime:
                    `${hnswStats.median.toFixed(6)} ms`,

                recall:
                    `${(
                        hnswRecall * 100
                    ).toFixed(2)}%`
            }
        },

        fastestAlgorithm,

        speedImprovement:
            `${speedImprovement.toFixed(2)}x`
    });
};

module.exports = {
    getVectors,
    insertVector,
    deleteVectorById,
    clearUserVectors,
    searchVectors,
    benchmarkSearch
};