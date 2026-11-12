const profile = require("../config/embedding");
const missingString = (field) => ({ $or: [{ $ne: [{ $type: field }, "string"] }, { $eq: [field, ""] }] });
async function inventory(db) {
    const vectors = await db.collection("vectors").aggregate([
        { $project: { owner: "$userId", id: "$vectorId", documentId: "$metadata.documentId",
            model: { $ifNull: ["$embeddingModel", "$metadata.embeddingModel"] },
            declaredDimensions: "$dimensions", profile: "$profile",
            dimensions: { $cond: [{ $isArray: "$values" }, { $size: "$values" }, 0] } } },
        { $facet: {
            summary: [{ $group: { _id: null, total: { $sum: 1 },
                missingModel: { $sum: { $cond: [missingString("$model"), 1, 0] } },
                missingProfile: { $sum: { $cond: [missingString("$profile"), 1, 0] } },
                unknownDimensions: { $sum: { $cond: [{ $eq: ["$dimensions", 0] }, 1, 0] } },
                incompatibleDimensions: { $sum: { $cond: [{ $ne: ["$dimensions", profile.dimensions] }, 1, 0] } },
                dimensionMismatch: { $sum: { $cond: [{ $and: [{ $isNumber: "$declaredDimensions" }, { $ne: ["$declaredDimensions", "$dimensions"] }] }, 1, 0] } },
                incompatibleModel: { $sum: { $cond: [{ $and: [{ $eq: [{ $type: "$model" }, "string"] }, { $ne: ["$model", profile.model] }] }, 1, 0] } },
                incompatibleProfile: { $sum: { $cond: [{ $and: [{ $eq: [{ $type: "$profile" }, "string"] }, { $ne: ["$profile", profile.profile] }] }, 1, 0] } },
                legacyDocumentChunks: { $sum: { $cond: [{ $eq: [{ $type: "$documentId" }, "string"] }, 1, 0] } }
            } }, { $project: { _id: 0 } }],
            duplicateGroups: [{ $group: { _id: { owner: "$owner", id: "$id" }, count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }, { $count: "count" }]
        } }
    ], { maxTimeMS: 15000, allowDiskUse: false }).toArray();
    const documents = await db.collection("documents").aggregate([
        { $project: { owner: "$userId", id: "$documentId", model: "$embeddingModel", profile: "$profile",
            dimensions: "$dimensions", chunks: { $cond: [{ $isArray: "$chunks" }, "$chunks", []] } } },
        { $facet: {
            summary: [{ $group: { _id: null, total: { $sum: 1 },
                emptyDocuments: { $sum: { $cond: [{ $eq: [{ $size: "$chunks" }, 0] }, 1, 0] } },
                incompatibleProfile: { $sum: { $cond: [{ $ne: ["$profile", profile.profile] }, 1, 0] } },
                incompatibleModel: { $sum: { $cond: [{ $ne: ["$model", profile.model] }, 1, 0] } },
                invalidChunkDimensions: { $sum: { $size: { $filter: { input: "$chunks", as: "chunk",
                    cond: { $ne: [{ $cond: [{ $isArray: "$$chunk.values" }, { $size: "$$chunk.values" }, 0] }, "$dimensions"] }
                } } } }
            } }, { $project: { _id: 0 } }],
            duplicateGroups: [{ $group: { _id: { owner: "$owner", id: "$id" }, count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }, { $count: "count" }]
        } }
    ], { maxTimeMS: 15000, allowDiskUse: false }).toArray();
    const normalize = (items) => ({ ...(items[0]?.summary[0] || { total: 0 }), duplicateGroups: items[0]?.duplicateGroups[0]?.count || 0 });
    return { vectors: normalize(vectors), documents: normalize(documents),
        limitations: ["Aggregate counts only; no identities or document text returned.", "Legacy completeness cannot be proved without original ingestion manifests.", "No records, indexes or collections modified."] };
}
async function main() {
    require("dotenv").config({ quiet: true });
    const { MongoClient } = require("mongoose").mongo;
    if (!process.env.MONGODB_URI) throw new Error("Missing configuration");
    const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000, socketTimeoutMS: 20000 });
    try { await client.connect(); console.log(JSON.stringify(await inventory(client.db()), null, 2)); }
    finally { await client.close(); }
}
if (require.main === module) main().catch(() => { console.error("Read-only inventory unavailable: check connectivity and read permissions. No database writes were attempted."); process.exitCode = 1; });
module.exports = { inventory };
