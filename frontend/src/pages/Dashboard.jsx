import { useCallback, useEffect, useState } from "react";
import {
  RefreshCw,
  Activity,
  Database,
  Layers,
  Cpu,
  FileText,
  MessageSquare,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import PageHeader from "../components/common/PageHeader";
import StatCard from "../components/common/StatCard";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import Skeleton from "../components/common/Skeleton";
import { checkHealth } from "../services/health.service";
import { getVectors } from "../services/vector.service";
import { formatDate, formatTime } from "../utils/formatters";

export default function Dashboard() {
  const [health, setHealth] = useState(null);
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);
  const settings = useSelector((s) => s.settings);
  const uploadHistory = useSelector((s) => s.upload.history);
  const chatMessages = useSelector((s) => s.chat.messages);
  const aiQueries = chatMessages.filter((message) => message.role === "user").length;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [healthRes, vectorsRes] = await Promise.all([
        checkHealth(),
        getVectors(),
      ]);
      setHealth(healthRes.data);
      setStats(vectorsRes.data.statistics);
      setRecent(vectorsRes.data.recentUploads || []);
      setLastUpdated(new Date());
    } catch (err) {
      toast.error(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="fade-in">
      <PageHeader
        title="Dashboard"
        description="Overview of your vector database, embeddings, and search configuration."
        action={
          <Button variant="secondary" onClick={fetchData} loading={loading}>
            <RefreshCw size={16} />
            Refresh
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <Badge variant={health?.success ? "success" : "warning"}>
          <Activity size={12} className="mr-1 inline" />
          {health?.success ? "Backend Online" : "Backend Offline"}
        </Badge>
        {health?.message && (
          <span className="font-mono text-xs text-gray-500">{health.message}</span>
        )}
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Vectors"
          value={stats?.totalVectors ?? "--"}
          sub={`${stats?.totalChunks ?? 0} chunks`}
          icon={Database}
          loading={loading}
        />
        <StatCard
          label="Total Chunks"
          value={stats?.totalChunks ?? 0}
          sub="Document/vector chunks"
          icon={Layers}
          loading={loading}
        />
        <StatCard
          label="Uploaded PDFs"
          value={uploadHistory.length}
          sub="Local session"
          icon={FileText}
          loading={loading}
        />
        <StatCard
          label="AI Queries"
          value={aiQueries}
          sub="Local chat session"
          icon={MessageSquare}
          loading={loading}
        />
        <StatCard
          label="Embedding Model"
          value={stats?.embeddingModel ?? settings.embeddingModel}
          sub="Active model"
          icon={Cpu}
          loading={loading}
        />
        <StatCard
          label="Search Algorithm"
          value={settings.algorithm.toUpperCase()}
          sub="Frontend request default"
          icon={Activity}
          loading={loading}
        />
        <StatCard
          label="Similarity Metric"
          value={settings.metric}
          sub="Frontend request default"
          icon={Activity}
          loading={loading}
        />
        <StatCard
          label="Last Updated"
          value={lastUpdated ? formatTime(lastUpdated) : "--"}
          sub={lastUpdated ? formatDate(lastUpdated) : "Awaiting refresh"}
          icon={Clock}
          loading={loading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-semibold">System Configuration</h3>
          {loading ? (
            <div className="space-y-3">
              <Skeleton />
              <Skeleton />
              <Skeleton />
            </div>
          ) : (
            <dl className="space-y-3 font-mono text-sm">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <dt className="text-gray-500">Search Algorithm</dt>
                <dd className="text-neon">{settings.algorithm}</dd>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <dt className="text-gray-500">Similarity Metric</dt>
                <dd>{settings.metric}</dd>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <dt className="text-gray-500">Top-K</dt>
                <dd>{settings.topK}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Backend URL</dt>
                <dd className="truncate text-xs">{settings.backendUrl}</dd>
              </div>
            </dl>
          )}
        </Card>

        <Card>
          <h3 className="mb-4 font-semibold">Recent Uploads</h3>
          {uploadHistory.length === 0 && recent.length === 0 ? (
            <p className="text-sm text-gray-500">
              No uploads yet. Upload a PDF to embed document chunks.
            </p>
          ) : (
            <ul className="space-y-3">
              {(uploadHistory.length ? uploadHistory : recent).slice(0, 5).map((item, i) => (
                <li
                  key={item.id || i}
                  className="flex items-center justify-between rounded-xl bg-white/[0.02] px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{item.name || item.fileName || "PDF Upload"}</p>
                    <p className="font-mono text-xs text-gray-500">
                      {item.chunks ?? item.totalChunks ?? 0} chunks
                      {item.uploadedAt && ` - ${formatDate(item.uploadedAt)}`}
                    </p>
                  </div>
                  <Badge variant="neon">{item.storedVectors ?? "--"} vectors</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
