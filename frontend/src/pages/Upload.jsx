import { useState } from "react";
import Layout from "../components/layout/Layout";
import PageHeader from "../components/common/PageHeader";
import { uploadPDF } from "../services/api";

function Upload() {

    const [file, setFile] = useState(null);

    const [message, setMessage] = useState("");

    const handleFileChange = (event) => {
        setFile(event.target.files[0]);
    };

    const handleUpload = async () => {

        if (!file) {
            setMessage("Please select a PDF file.");
            return;
        }

        const formData = new FormData();

        formData.append("pdf", file);

        try {

            const response =
                await uploadPDF(formData);

            setMessage(response.data.message);

        } catch (error) {

    console.error(error);

    console.error(error.response);

    console.error(error.response?.data);

    setMessage(
        error.response?.data?.message || error.message
    );

}

    };

    return (

        <Layout>

            <PageHeader
                title="Upload PDF"
                subtitle="Upload your document to generate embeddings."
            />

            <div className="bg-slate-800 rounded-xl p-6">

                <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="mb-5 text-white"
                />

                <button
                    onClick={handleUpload}
                    className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold px-6 py-3 rounded-lg"
                >
                    Upload PDF
                </button>

                {
                    message && (

                        <p className="text-green-400 mt-5">

                            {message}

                        </p>

                    )
                }

            </div>

        </Layout>

    );

}

export default Upload;