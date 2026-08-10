import { useCallback, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import toast from "react-hot-toast";
import { Zap, Trophy, Target } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import StatCard from "../components/common/StatCard";
import Loader from "../components/common/Loader";
import Table from "../components/common/Table";
import { runBenchmark } from "../services/vector.service";
import { normalizeBenchmarkRows } from "../utils/apiNormalizers";

const NEON = "#ccff00";
const CYAN = "#00e5ff";
const ORANGE = "#ff6b00";

export default function Benchmark() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchBenchmark = useCallback(async () => {
    setLoading(true);
    try {
      const res = await runBenchmark();
      setData(res.data);
      toast.success("Benchmark complete");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const rows = normalizeBenchmarkRows(data);
  const chartData = rows.map((row) => ({
    name: row.algorithm,
    time: row.average,
    recall: row.recall,
  }));

  const fastestKey = data?.fastestAlgorithm;
  const fastestLabel =
    fastestKey === "bruteForce"
      ? "Brute Force"
      : fastestKey === "kdTree"
        ? "KD-Tree"
        : fastestKey === "hnsw"
          ? "HNSW"
          : "--";

  const tableRows = rows.map((row) => ({
    ...row,
    average: `${row.average.toFixed(4)} ms`,
    min: `${row.min.toFixed(4)} ms`,
    max: `${row.max.toFixed(4)} ms`,
    median: `${row.median.toFixed(4)} ms`,
  }));

  return (
    <div className="fade-in">
      <PageHeader
        title="Algorithm Benchmark"
        description="Compare Brute Force, KD-Tree, and HNSW execution time and recall."
        action={
          <Button onClick={fetchBenchmark} loading={loading}>
            Run Benchmark
          </Button>
        }
      />

      {loading && <Loader label="Running 100 benchmark iterations..." />}

      {data && !loading && (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Dataset Size"
              value={data.datasetSize}
              sub={`${data.queryCount} queries - k=${data.k}`}
              icon={Target}
            />
            <StatCard
              label="Fastest Algorithm"
              value={fastestLabel}
              sub={`${data.speedImprovement} faster than brute force`}
              icon={Trophy}
            />
            <StatCard
              label="Speed Improvement"
              value={data.speedImprovement}
              sub="vs Brute Force baseline"
              icon={Zap}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h3 className="mb-4 font-semibold">Execution Time (ms)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" stroke="#666" fontSize={12} />
                  <YAxis stroke="#666" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: "#0a0a0a",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12,
                    }}
                  />
                  <Bar dataKey="time" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell
                        key={entry.name}
                        fill={
                          entry.name === fastestLabel
                            ? NEON
                            : i === 1
                              ? CYAN
                              : ORANGE
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <h3 className="mb-2 font-semibold">Performance Table</h3>
              <p className="mb-3 text-xs text-orange-300">
                Backend benchmark currently clears and reloads benchmark vectors before running.
              </p>
              <Table
                columns={[
                  { key: "algorithm", label: "Algorithm" },
                  { key: "average", label: "Avg" },
                  { key: "min", label: "Min" },
                  { key: "max", label: "Max" },
                  { key: "median", label: "Median" },
                  { key: "recall", label: "Recall" },
                  {
                    key: "status",
                    label: "Status",
                    render: (row) => (
                      <Badge variant={row.status === "Fastest" ? "fastest" : "default"}>
                        {row.status}
                      </Badge>
                    ),
                  },
                ]}
                rows={tableRows}
              />
            </Card>
          </div>
        </>
      )}

      {!data && !loading && (
        <Card>
          <p className="text-center text-sm text-gray-500">
            Click Run Benchmark to compare all three search algorithms.
          </p>
        </Card>
      )}
    </div>
  );
}
