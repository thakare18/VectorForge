module.exports = {
    PORT: process.env.PORT || 3000,

    VECTOR_DIMENSION: 16,

    DEFAULT_K: 5,

    HNSW: {
        M: 16,
        EF_CONSTRUCTION: 200,
        EF_SEARCH: 50
    }
};