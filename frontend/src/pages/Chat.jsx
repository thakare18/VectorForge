import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown"; 
import remarkGfm from "remark-gfm"; 
import toast from "react-hot-toast";

import Layout from "../components/layout/Layout";
import PageHeader from "../components/common/PageHeader";
import { askAI } from "../services/api";

function Chat() {

    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState("");
    const [loading, setLoading] = useState(false);
    const [sources, setSources] = useState([]);


const answerRef = useRef(null);

const [copied, setCopied] = useState(false);

    const handleAskAI = async () => {

    if (!question.trim()) {
        return;
    }

    setLoading(true);

    setAnswer("");

    setSources([]);

    try {

        const response = await askAI(question);

        setAnswer(response.data.answer);
        toast.success("AI response generated.");

        setSources(response.data.sources || []);

    } catch (error) {

        console.error(error);

        setAnswer(

            error.response?.data?.message ||

            "Something went wrong."
            

        );
        toast.error("Failed to get AI response.");

    } finally {

        setLoading(false);

    }

};


// UPDATED
const handleCopy = async () => {

    if (!answer) return;

    await navigator.clipboard.writeText(answer);

    setCopied(true);
    toast.success("Answer copied successfully!");

    setTimeout(() => {

        setCopied(false);

    }, 2000);

};


const handleClear = () => {

    setQuestion("");

    setAnswer("");

    setSources([]);

};


useEffect(() => {

    if (answer && answerRef.current) {

        answerRef.current.scrollIntoView({

            behavior: "smooth"

        });

    }

}, [answer]);

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

    className={`

        mt-5

        px-6

        py-3

        rounded-lg

        font-semibold

        transition-all

        duration-300

        ${

            loading

                ? "bg-slate-500 cursor-not-allowed"

                : "bg-cyan-500 hover:bg-cyan-600 text-black"

        }

    `}

>

    {

        loading

            ? " AI is Thinking..."

            : " Ask AI"

    }

</button>

                {

                    answer && (

    // UPDATED

    <div
        ref={answerRef}
        className="mt-8 bg-slate-700 rounded-lg p-5"
    >

        <div className="flex justify-between items-center mb-4">

            <h2 className="text-xl font-semibold text-white">

                AI Answer

            </h2>

            <div className="flex gap-3">

                <button

                    onClick={handleCopy}

                    className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white"

                >

                    {

                        copied

                            ? "Copied !"

                            : "Copy"

                    }

                </button>

                <button

                    onClick={handleClear}

                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white"

                >

                    Clear

                </button>

            </div>

        </div>

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

                                sources.map((source, index) => (

                                    <div
                                        key={`${source.id}-${index}`}
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