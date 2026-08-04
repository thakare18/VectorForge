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

    const stats = [
        {
            id: 1,
            title: "Total Vectors",
            value: vectorCount
        },
        {
            id: 2,
            title: "Uploaded PDFs",
            value: "12"
        },
        {
            id: 3,
            title: "AI Queries",
            value: "540"
        },
        {
            id: 4,
            title: "Search Algorithm",
            value: "HNSW"
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
    useEffect(() => {

        const fetchVectors = async () => {

            try {

                const response = await getVectors();

                setVectorCount(response.data.count);

            } catch (error) {

                console.error(error);

            }

        };

        fetchVectors();

    }, []);

    return (
        <Layout>

            <PageHeader
                title="Dashboard"
                subtitle="Welcome to VectorForge AI Vector Database"
            />

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