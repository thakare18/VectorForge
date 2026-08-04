import { useState } from "react";
import Layout from "../components/layout/Layout";
import PageHeader from "../components/common/PageHeader";

function Chat() {

    /* 
       State for question input
    */
    const [question, setQuestion] = useState("");

    return (
        <Layout>

            <PageHeader
                title="AI Chat"
                subtitle="Ask questions from your uploaded documents."
            />

            {/*
               Chat Container
            */}
            <div className="bg-slate-800 rounded-xl p-6">

                {/* 
                   Question Input
                */}
                <textarea
                    rows="6"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask anything about your uploaded PDF..."
                    className="w-full rounded-lg p-4 bg-slate-700 text-white outline-none"
                />

                {/* 
                   Ask Button
                */}
                <button
                    className="mt-5 bg-cyan-500 hover:bg-cyan-600 px-6 py-3 rounded-lg font-semibold text-black"
                >
                    Ask AI
                </button>

            </div>

        </Layout>
    );

}

export default Chat;