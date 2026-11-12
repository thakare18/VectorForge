// pdf-parse swallows per-page failures. Count completed renders to reject partial extraction.
async function parseComplete(data, parser = require("pdf-parse")) {
    let completed = 0;
    const result = await parser(data, { max: 500, pagerender: async (page) => {
        const content = await page.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false });
        let lastY, text = "";
        for (const item of content.items) {
            text += lastY === item.transform[5] || !lastY ? item.str : "\n" + item.str;
            lastY = item.transform[5];
        }
        completed++;
        return text;
    } });
    if (!Number.isInteger(result.numpages) || result.numpages < 1 || result.numpages > 500 || completed !== result.numpages || typeof result.text !== "string" || result.text.length > 100000) {
        throw new Error("Incomplete or oversized PDF extraction");
    }
    return result.text;
}
module.exports = { parseComplete };
