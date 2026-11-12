// Dry-run by default. Only this version's namespaced temporary files are eligible.
const { cleanupOrphans } = require("../services/upload-files.service");
cleanupOrphans({ apply: process.argv.includes("--apply") })
    .then((files) => console.log(JSON.stringify({ applied: process.argv.includes("--apply"), eligibleTemporaryFiles: files })))
    .catch(() => { console.error("Temporary-file cleanup failed."); process.exitCode = 1; });
