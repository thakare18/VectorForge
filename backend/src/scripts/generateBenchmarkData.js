const fs = require("fs");
const path = require("path");

const TOTAL_VECTORS = 10000;
const DIMENSIONS = 16;

const vectors = [];

for (let i = 1; i <= TOTAL_VECTORS; i++) {

    const values = [];

    for (let j = 0; j < DIMENSIONS; j++) {
        values.push(Number(Math.random().toFixed(4)));
    }

    vectors.push({
        id: String(i),
        values,
        metadata: {
            title: `Vector ${i}`,
            category: "Benchmark"
        }
    });

}

const output = `module.exports = ${JSON.stringify(vectors, null, 4)};`;

fs.writeFileSync(
    path.join(__dirname, "../data/benchmarkData.js"),
    output
);

console.log("benchmarkData.js created successfully.");
console.log(`Vectors Generated : ${TOTAL_VECTORS}`);