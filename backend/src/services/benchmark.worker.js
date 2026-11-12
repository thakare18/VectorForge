const { parentPort, workerData } = require("node:worker_threads");
const { benchmarkSearch } = require("./benchmark.service");
let status = 200;
benchmarkSearch({ benchmarkOptions: workerData || undefined }, {
    status(code) { status = code; return this; },
    json(data) { parentPort.postMessage({ status, data }); }
});
