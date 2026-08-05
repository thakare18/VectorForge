import { useEffect, useState } from "react";
import Layout from "../components/layout/Layout";
import PageHeader from "../components/common/PageHeader";
import Card from "../components/common/Card";
import { getVectors } from "../services/api";

function Dashboard() {

    /* 
       Store vector count from backend
    */
    const [vectorCount, setVectorCount] = useState(0);

    const [loading, setLoading] = useState(true);

const [lastUpdated, setLastUpdated] = useState("");

   // UPDATED

const stats = [

    {
        id: 1,
        title: "Total Vectors",
        value: loading ? "..." : vectorCount
    },

    {
        id: 2,
        title: "Vector Chunks",
        value: loading ? "..." : vectorCount
    },

    {
        id: 3,
        title: "Embedding Model",
        value: "text-embedding-004"
    },

    {
        id: 4,
        title: "Similarity",
        value: "Cosine"
    }

];

    const activities = [
        {
            id: 1,
            text: "Uploaded RAID.pdf"
        },
        {
            id: 2,
            text: "Generated AI Answer"
        },
        {
            id: 3,
            text: "Benchmark Completed"
        },
        {
            id: 4,
            text: "Inserted New Vector"
        }
    ];

    /* 
       Fetch vectors when component loads
    */
    // UPDATED

const fetchVectors = async () => {

    setLoading(true);

    try {

        const response = await getVectors();

        setVectorCount(response.data.count);

        setLastUpdated(

            new Date().toLocaleTimeString()

        );

    } catch (error) {

        console.error(error);

    } finally {

        setLoading(false);

    }

};

useEffect(() => {

    fetchVectors();

}, []);

    return (
        <Layout>

            <PageHeader
                title="Dashboard"
                subtitle="Welcome to VectorForge AI Vector Database"
            />

            {/* UPDATED */}

<div className="flex justify-between items-center mt-6 mb-6">

    <p className="text-slate-400">

        Last Updated :

        <span className="text-cyan-400 ml-2">

            {

                lastUpdated ||

                "--"

            }

        </span>

    </p>

    <button

        onClick={fetchVectors}

        disabled={loading}

        className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-600 text-black font-semibold px-5 py-2 rounded-lg transition-all"

    >

        {

            loading

                ? "Refreshing..."

                : "Refresh Dashboard"

        }

    </button>

</div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

                {stats.map((item) => (
                    <Card
                        key={item.id}
                        title={item.title}
                        value={item.value}
                    />
                ))}

            </div>

            <div className="mt-10 bg-slate-800 rounded-xl p-6">

                <h2 className="text-xl font-semibold text-white mb-5">
                    Recent Activity
                </h2>

                <div className="space-y-3">

                    {activities.map((activity) => (

                        <div
                            key={activity.id}
                            className="bg-slate-700 rounded-lg p-4 text-white"
                        >
                            {activity.text}
                        </div>

                    ))}

                </div>

            </div>

        </Layout>
    );

}

export default Dashboard;