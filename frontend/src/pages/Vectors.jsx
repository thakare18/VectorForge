import { metadataText, movePage } from "../utils/workflows";
import Button from "../components/common/Button";
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
  const [page, setPage] = useState({ offset: 0, history: [] });
  const { offset } = page;
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getVectors({ offset, limit: 100 })
      .then((res) => {
        setVectors(res.data.data || []);
        setStats(res.data.statistics);
        setPagination(res.data.pagination);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [offset]);

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
                render: (row) => metadataText(row.metadata?.category, "--"),
              },
              {
                key: "preview",
                label: "Preview",
                render: (row) =>
                  (metadataText(row.metadata?.text) || metadataText(row.metadata?.title, "--")).slice(0, 60),
              },
            ]}
            rows={vectors}
            emptyMessage="No vectors stored yet."
          />
          <div className="mt-4 flex items-center gap-3">
            <Button disabled={!offset} onClick={() => setPage((current) => movePage(current, "previous"))}>Previous</Button>
            <span>{offset + (vectors.length ? 1 : 0)}–{offset + vectors.length} of {pagination?.total || 0}</span>
            <Button disabled={!pagination?.hasMore} onClick={() => setPage((current) => movePage(current, "next", vectors.length))}>Next</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
