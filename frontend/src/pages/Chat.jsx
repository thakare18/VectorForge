import { useState } from "react";
import ReactMarkdown from "react-markdown"; 
import remarkGfm from "remark-gfm"; 

import Layout from "../components/layout/Layout";
import PageHeader from "../components/common/PageHeader";
import { askAI } from "../services/api";

function Chat() {

    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState("");
    const [loading, setLoading] = useState(false);

    // UPDATED
    const [sources, setSources] = useState([]);

    const handleAskAI = async () => {

        if (!question.trim()) {
            return;
        }

        setLoading(true);

        setAnswer("");

        // UPDATED
        setSources([]);

        try {

            const response = await askAI(question);

            setAnswer(response.data.answer);

            // UPDATED
            setSources(response.data.sources);

        } catch (error) {

            console.error(error);

            setAnswer(
                error.response?.data?.message ||
                "Something went wrong."
            );

        } finally {

            setLoading(false);

        }

    };

    return (

        <Layout>

            <PageHeader
                title="AI Chat"
                subtitle="Ask questions from your uploaded documents."
            />

            <div className="bg-slate-800 rounded-xl p-6">

                <textarea
                    rows="6"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask anything about your uploaded PDF..."
                    className="w-full rounded-lg p-4 bg-slate-700 text-white outline-none"
                />

                <button
                    onClick={handleAskAI}
                    disabled={loading}
                    className="mt-5 bg-cyan-500 hover:bg-cyan-600 px-6 py-3 rounded-lg font-semibold text-black"
                >
                    {
                        loading
                            ? "Thinking..."
                            : "Ask AI"
                    }
                </button>

                {

                    answer && (

                        <div className="mt-8 bg-slate-700 rounded-lg p-5">

                            <h2 className="text-xl font-semibold text-white mb-3">

                                AI Answer

                            </h2>

                            {/* UPDATED */}

                            <div className="prose prose-invert max-w-none">

                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                >
                                    {answer}
                                </ReactMarkdown>

                            </div>

                        </div>

                    )

                }

                {/* UPDATED */}

                {

                    sources.length > 0 && (

                        <div className="mt-8 bg-slate-700 rounded-lg p-5">

                            <h2 className="text-xl font-semibold text-white mb-4">

                                Sources

                            </h2>

                            {

                                sources.map((source) => (

                                    <div
                                        key={source.id}
                                        className="bg-slate-600 rounded-lg p-4 mb-3"
                                    >

                                        <p className="text-white font-semibold">

                                            {source.id}

                                        </p>

                                        <p className="text-slate-300">

                                            Similarity : {(source.score * 100).toFixed(2)}%

                                        </p>

                                    </div>

                                ))

                            }

                        </div>

                    )

                }

            </div>

        </Layout>

    );

}

export default Chat;