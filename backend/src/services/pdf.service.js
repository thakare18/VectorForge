const fs = require("fs");

const pdf = require("pdf-parse");

const extractText = async (
    filePath
) => {

    const buffer =
        fs.readFileSync(
            filePath
        );

    const data =
        await pdf(buffer);

    return data.text;

};

const createChunks = (
    text,
    chunkSize = 500,
    overlap = 100
) => {

    const chunks = [];

    let start = 0;

    while (start < text.length) {

        const end = start + chunkSize;

        chunks.push(

            text.slice(start, end)

        );

        start +=
            chunkSize - overlap;

    }

    return chunks;

};

module.exports = {

    extractText,
    createChunks


};