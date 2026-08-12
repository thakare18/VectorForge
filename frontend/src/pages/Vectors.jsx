import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import PageHeader from "../components/common/PageHeader";
import Card from "../components/common/Card";
import Loader from "../components/common/Loader";
import Table from "../components/common/Table";
import Badge from "../components/common/Badge";
import { getVectors } from "../services/vector.service";
import { formatScore } from "../utils/formatters";

export default function Vectors() {
  const [vectors, setVectors] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVectors()
      .then((res) => {
        setVectors(res.data.data || []);
        setStats(res.data.statistics);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="fade-in">
      <PageHeader
        title="Stored Vectors"
        description="All vectors currently in the database with metadata previews."
      />

      {loading ? (
        <Loader />
      ) : (
        <Card>
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge variant="neon">{stats?.totalVectors ?? 0} vectors</Badge>
            <Badge>{stats?.embeddingModel}</Badge>
            <Badge>{stats?.similarityMetric}</Badge>
          </div>
          <Table
            columns={[
              { key: "id", label: "ID" },
              {
                key: "dims",
                label: "Dimensions",
                render: (row) => row.values?.length ?? "--",
              },
              {
                key: "category",
                label: "Category",
                render: (row) => row.metadata?.category || "--",
              },
              {
                key: "preview",
                label: "Preview",
                render: (row) =>
                  (row.metadata?.text || row.metadata?.title || "--").slice(0, 60),
              },
            ]}
            rows={vectors}
            emptyMessage="No vectors stored yet."
          />
        </Card>
      )}
    </div>
  );
}
