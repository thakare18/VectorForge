import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import PageHeader from "../components/common/PageHeader";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import Loader from "../components/common/Loader";
import ResultCard from "../components/search/ResultCard";
import { embedText } from "../services/ai.service";
import { searchVectors, getVectors, insertVector } from "../services/vector.service";
import {
  setSearchLoading,
  setSearchResults,
  setSearchError,
  setVectorsData,
  setQuery,
} from "../store/slices/searchSlice";
import { ALGORITHMS, METRICS } from "../utils/constants";
import { normalizeSearchResults } from "../utils/apiNormalizers";

const parseVectorInput = (value) =>
  value
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map(Number);

export default function Search() {
  const dispatch = useDispatch();
  const { query, results, loading, error, algorithm, metric, topK } =
    useSelector((s) => s.search);
  const settings = useSelector((s) => s.settings);
  const [localAlgo, setLocalAlgo] = useState(settings.algorithm);
  const [localMetric, setLocalMetric] = useState(settings.metric);
  const [localK, setLocalK] = useState(settings.topK);
  const [inputMode, setInputMode] = useState("text");
  const [manualVector, setManualVector] = useState("");
  const [insertForm, setInsertForm] = useState({
    id: "",
    values: "",
    category: "",
    text: "",
  });

  useEffect(() => {
    getVectors()
      .then((res) => dispatch(setVectorsData(res.data)))
      .catch(() => {});
  }, [dispatch]);

  const handleSearch = async () => {
    if (inputMode === "text" && !query.trim()) {
      toast.error("Enter a search query");
      return;
    }

    if (inputMode === "vector" && !manualVector.trim()) {
      toast.error("Enter a vector");
      return;
    }

    dispatch(setSearchLoading(true));
    try {
      const embedding =
        inputMode === "text"
          ? (await embedText(query)).data.embedding
          : parseVectorInput(manualVector);

      if (!Array.isArray(embedding) || embedding.some((value) => Number.isNaN(value))) {
        throw new Error("Vector must contain only numbers separated by commas or spaces");
      }

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
      toast.success(`Found ${searchRes.data.count} results`);
    } catch (err) {
      dispatch(setSearchError(err.message));
      toast.error(err.message);
    } finally {
      dispatch(setSearchLoading(false));
    }
  };

  const handleInsert = async (event) => {
    event.preventDefault();

    const values = parseVectorInput(insertForm.values);
    if (!insertForm.id.trim()) {
      toast.error("Vector ID is required");
      return;
    }
    if (!values.length || values.some((value) => Number.isNaN(value))) {
      toast.error("Vector values must be numbers");
      return;
    }

    try {
      await insertVector({
        id: insertForm.id.trim(),
        values,
        metadata: {
          category: insertForm.category.trim() || undefined,
          text: insertForm.text.trim() || undefined,
        },
      });
      const vectorsRes = await getVectors();
      dispatch(setVectorsData(vectorsRes.data));
      setInsertForm({ id: "", values: "", category: "", text: "" });
      toast.success("Vector inserted");
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="fade-in">
      <PageHeader
        title="Vector Search Lab"
        description="Embed your query text and search across stored vectors using Brute Force, KD-Tree, or HNSW."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="mb-4 grid grid-cols-2 gap-2 rounded-full bg-white/[0.03] p-1">
            {[
              ["text", "Text Query"],
              ["vector", "Raw Vector"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setInputMode(value)}
                className={`rounded-full px-3 py-2 text-xs transition-colors ${
                  inputMode === value
                    ? "bg-neon text-black"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {inputMode === "text" ? (
            <>
              <label className="mb-2 block font-mono text-xs uppercase text-gray-500">
                Query Text
              </label>
              <textarea
                value={query}
                onChange={(e) => dispatch(setQuery(e.target.value))}
                rows={4}
                placeholder="Example: Explain binary trees and graph algorithms..."
                className="mb-4 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder:text-gray-500 focus:border-neon/40 focus:outline-none"
              />
            </>
          ) : (
            <>
              <label className="mb-2 block font-mono text-xs uppercase text-gray-500">
                Vector Input
              </label>
              <textarea
                value={manualVector}
                onChange={(e) => setManualVector(e.target.value)}
                rows={4}
                placeholder="0.12, 0.23, 0.34, 0.45"
                className="mb-4 w-full rounded-xl border border-white/10 bg-white/5 p-3 font-mono text-sm text-white placeholder:text-gray-500 focus:border-neon/40 focus:outline-none"
              />
            </>
          )}

          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="font-mono text-xs uppercase text-gray-500">Algorithm</span>
              <select
                value={localAlgo}
                onChange={(e) => setLocalAlgo(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
              >
                {ALGORITHMS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="font-mono text-xs uppercase text-gray-500">Metric</span>
              <select
                value={localMetric}
                onChange={(e) => setLocalMetric(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
              >
                {METRICS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mb-6 block">
            <span className="font-mono text-xs uppercase text-gray-500">
              Top-K: {localK}
            </span>
            <input
              type="range"
              min={1}
              max={10}
              value={localK}
              onChange={(e) => setLocalK(Number(e.target.value))}
              className="mt-2 w-full accent-[#ccff00]"
            />
          </label>

          <Button onClick={handleSearch} loading={loading} className="w-full">
            Search Vectors
          </Button>

          <form onSubmit={handleInsert} className="mt-6 border-t border-white/10 pt-6">
            <h3 className="mb-3 font-semibold">Insert Vector</h3>
            <div className="space-y-3">
              <input
                value={insertForm.id}
                onChange={(e) => setInsertForm({ ...insertForm, id: e.target.value })}
                placeholder="Vector ID"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
              />
              <textarea
                value={insertForm.values}
                onChange={(e) => setInsertForm({ ...insertForm, values: e.target.value })}
                rows={3}
                placeholder="Values: 0.1, 0.2, 0.3"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm"
              />
              <input
                value={insertForm.category}
                onChange={(e) => setInsertForm({ ...insertForm, category: e.target.value })}
                placeholder="Category metadata"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
              />
              <textarea
                value={insertForm.text}
                onChange={(e) => setInsertForm({ ...insertForm, text: e.target.value })}
                rows={2}
                placeholder="Text preview metadata"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
              />
              <Button type="submit" variant="secondary" className="w-full">
                Insert Vector
              </Button>
            </div>
          </form>
        </Card>

        <div className="lg:col-span-2">
          {loading && <Loader label="Embedding & searching..." />}
          {error && (
            <Card className="border-red-500/20 text-red-400">{error}</Card>
          )}
          {!loading && !error && results.length === 0 && (
            <Card>
              <p className="text-center text-sm text-gray-500">
                Run a search to see result cards with id, score, and metadata preview.
              </p>
            </Card>
          )}
          <div className="space-y-3">
            {results.map((result, i) => (
              <ResultCard key={result.id} result={result} rank={i + 1} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
