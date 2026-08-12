import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import PageHeader from "../components/common/PageHeader";
import Card from "../components/common/Card";
import StatCard from "../components/common/StatCard";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import VectorCanvas from "../components/visualizer/VectorCanvas";
import PlaybackControls from "../components/visualizer/PlaybackControls";
import ResultCard from "../components/search/ResultCard";
import { embedText } from "../services/ai.service";
import { searchVectors, getVectors } from "../services/vector.service";
import {
  setSearchLoading,
  setSearchResults,
  setVectorsData,
  setQuery,
} from "../store/slices/searchSlice";
import { ALGORITHMS, METRICS } from "../utils/constants";
import { formatScore } from "../utils/formatters";
import { normalizeSearchResults } from "../utils/apiNormalizers";

export default function Visualizer() {
  const dispatch = useDispatch();
  const { query, results, trace, vectors, loading } = useSelector((s) => s.search);
  const settings = useSelector((s) => s.settings);

  const [localQuery, setLocalQuery] = useState(query || "vector search algorithms");
  const [localAlgo, setLocalAlgo] = useState(settings.algorithm);
  const [localMetric, setLocalMetric] = useState(settings.metric);
  const [localK, setLocalK] = useState(3);
  const [queryVector, setQueryVector] = useState(null);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const visited = trace?.visitedNodes || trace?.searchPath || [];
  const totalSteps = visited.length || 1;

  useEffect(() => {
    getVectors()
      .then((res) => dispatch(setVectorsData(res.data)))
      .catch(() => {});
  }, [dispatch]);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setStep((s) => {
        if (s >= totalSteps - 1) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 700);
    return () => clearInterval(timer);
  }, [playing, totalSteps]);

  const runVisualization = async () => {
    dispatch(setSearchLoading(true));
    try {
      const embedRes = await embedText(localQuery);
      const embedding = embedRes.data.embedding;
      setQueryVector(embedding);
      dispatch(setQuery(localQuery));

      const searchRes = await searchVectors({
        vector: embedding,
        k: localK,
        metric: localMetric,
        algorithm: localAlgo,
        includeTrace: true,
      });

      dispatch(
        setSearchResults({
          results: normalizeSearchResults(searchRes.data.data, searchRes.data.trace),
          trace: searchRes.data.trace,
          algorithm: searchRes.data.algorithm,
        })
      );
      setStep(0);
      toast.success("Visualization ready");
    } catch (err) {
      toast.error(err.message);
    } finally {
      dispatch(setSearchLoading(false));
    }
  };

  const nearest = results[0];

  return (
    <div className="fade-in">
      <PageHeader
        title="Algorithm Visualizer"
        description="Watch how Brute Force, KD-Tree, and HNSW explore the vector space step by step."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Current Step"
          value={`${Math.min(step + 1, totalSteps)} / ${totalSteps}`}
          sub={step >= totalSteps - 1 ? "Search complete" : "Exploring..."}
        />
        <StatCard
          label="Visited Vectors"
          value={visited.length}
          sub="Nodes inspected before final top-k"
        />
        <StatCard
          label="Nearest Result"
          value={nearest ? `${nearest.id} (${formatScore(nearest.score)})` : "--"}
          sub="Smallest distance to query"
        />
      </div>

      <Card className="mb-6">
        <div className="mb-4 flex flex-wrap items-end gap-4">
          <label className="min-w-[200px] flex-1">
            <span className="font-mono text-xs uppercase text-gray-500">Query</span>
            <input
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
            />
          </label>
          <label>
            <span className="font-mono text-xs uppercase text-gray-500">Algorithm</span>
            <select
              value={localAlgo}
              onChange={(e) => setLocalAlgo(e.target.value)}
              className="mt-1 block rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
            >
              {ALGORITHMS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="font-mono text-xs uppercase text-gray-500">Metric</span>
            <select
              value={localMetric}
              onChange={(e) => setLocalMetric(e.target.value)}
              className="mt-1 block rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
            >
              {METRICS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="font-mono text-xs uppercase text-gray-500">Top-K: {localK}</span>
            <input
              type="range"
              min={1}
              max={8}
              value={localK}
              onChange={(e) => setLocalK(Number(e.target.value))}
              className="mt-2 block w-32 accent-[#ccff00]"
            />
          </label>
          <Button onClick={runVisualization} loading={loading}>
            Run Search
          </Button>
        </div>

        <PlaybackControls
          step={step}
          totalSteps={totalSteps}
          playing={playing}
          onPrev={() => setStep((s) => Math.max(0, s - 1))}
          onNext={() => setStep((s) => Math.min(totalSteps - 1, s + 1))}
          onPlay={() => setPlaying((p) => !p)}
          onReset={() => { setStep(0); setPlaying(false); }}
        />
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <VectorCanvas
            vectors={vectors}
            queryVector={queryVector}
            results={results}
            trace={trace}
            step={step}
          />
        </div>
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Top Results</h3>
            <Badge variant="neon">{localAlgo}</Badge>
          </div>
          <div className="space-y-3">
            {results.length === 0 ? (
              <p className="text-sm text-gray-500">Run a search to see results.</p>
            ) : (
              results.map((r, i) => (
                <ResultCard key={r.id} result={r} rank={i + 1} />
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
