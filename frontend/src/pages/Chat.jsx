import { useState } from "react";
import Layout from "../components/layout/Layout";
import PageHeader from "../components/common/PageHeader";
import { askAI } from "../services/api";

function Chat() {

    const [question, setQuestion] = useState("");

    /* 
       Store AI Answer
    */
    const [answer, setAnswer] = useState("");

    /* 
       Loading State
    */
    const [loading, setLoading] = useState(false);

    /*Ask AI Function */
    const handleAskAI = async () => {

        if (!question.trim()) {
            return;
        }

        setLoading(true);

        setAnswer("");

        try {

            const response =
                await askAI(question);

            setAnswer(response.data.answer);

        } catch (error) {

    console.error(error);

    setAnswer(

        error.response?.data?.message ||

        error.message

    );

}finally {

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

                    onChange={(e) =>
                        setQuestion(e.target.value)
                    }

                    placeholder="Ask anything about your uploaded PDF..."

                    className="w-full rounded-lg p-4 bg-slate-700 text-white outline-none"

                />

                {/* ===== UPDATED =====
                   Button connected with Backend
                */}

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

                {/* Answer Section*/}

                {

                    answer && (

                        <div className="mt-8 bg-slate-700 rounded-lg p-5">

                            <h2 className="text-xl font-semibold text-white mb-3">

                                AI Answer

                            </h2>

                            <p className="text-slate-200 whitespace-pre-line">

                                {answer}

                            </p>

                        </div>

                    )

                }

            </div>

        </Layout>

    );

}

export default Chat;