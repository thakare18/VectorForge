import Layout from "../components/layout/Layout";
import PageHeader from "../components/common/PageHeader";
import Card from "../components/common/Card";

function Dashboard() {

    // ===== UPDATED =====
    // Dashboard Statistics
    const stats = [
        {
            id: 1,
            title: "Total Vectors",
            value: "250"
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

    // ===== UPDATED =====
    // Recent Activity Data
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

    return (
        <Layout>

            <PageHeader
                title="Dashboard"
                subtitle="Welcome to VectorForge AI Vector Database"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

               
                {/* Dynamic Cards */}

                {stats.map((item) => (
                    <Card
                        key={item.id}
                        title={item.title}
                        value={item.value}
                    />
                ))}

            </div>

            
            {/* Recent Activity Section */}

            <div className="mt-10 bg-slate-800 rounded-xl p-6">

                <h2 className="text-xl font-semibold text-white mb-5">
                    Recent Activity
                </h2>

                <div className="space-y-3">

                    {activities.map((activity) => (

                        <div
                            key={activity.id}
                            className="bg-slate-700 rounded-lg p-4"
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