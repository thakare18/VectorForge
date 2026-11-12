function makePDF(text) {
    const stream = "BT /F1 12 Tf 72 720 Td (" + text + ") Tj ET";
    const objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        "<< /Length " + Buffer.byteLength(stream) + " >>\nstream\n" + stream + "\nendstream"
    ];
    let data = "%PDF-1.4\n"; const offsets = [0];
    objects.forEach((object, i) => { offsets.push(Buffer.byteLength(data)); data += (i + 1) + " 0 obj\n" + object + "\nendobj\n"; });
    const xref = Buffer.byteLength(data);
    data += "xref\n0 6\n0000000000 65535 f \n" + offsets.slice(1).map((offset) => String(offset).padStart(10, "0") + " 00000 n \n").join("");
    return data + "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF";
}
module.exports = { makePDF };
