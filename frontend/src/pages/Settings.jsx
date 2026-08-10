import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import PageHeader from "../components/common/PageHeader";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import {
  updateSettings,
  resetSettings,
  defaultSettings,
} from "../store/slices/settingsSlice";
import { ALGORITHMS, METRICS } from "../utils/constants";

export default function Settings() {
  const dispatch = useDispatch();
  const settings = useSelector((s) => s.settings);
  const [local, setLocal] = useState({ ...settings });

  const save = () => {
    dispatch(updateSettings(local));
    toast.success("Settings saved locally");
  };

  const reset = () => {
    dispatch(resetSettings());
    setLocal({ ...defaultSettings });
    toast.success("Settings reset");
  };

  return (
    <div className="fade-in">
      <PageHeader
        title="Settings"
        description="Frontend preferences stored in local storage. Algorithm and metric settings are sent with search requests."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-semibold">Search Preferences</h3>
          <div className="space-y-4">
            <label className="block">
              <span className="font-mono text-xs uppercase text-gray-500">Backend URL</span>
              <input
                value={local.backendUrl}
                onChange={(e) => setLocal({ ...local, backendUrl: e.target.value })}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="font-mono text-xs uppercase text-gray-500">Algorithm</span>
              <select
                value={local.algorithm}
                onChange={(e) => setLocal({ ...local, algorithm: e.target.value })}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
              >
                {ALGORITHMS.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="font-mono text-xs uppercase text-gray-500">Metric</span>
              <select
                value={local.metric}
                onChange={(e) => setLocal({ ...local, metric: e.target.value })}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
              >
                {METRICS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="font-mono text-xs uppercase text-gray-500">
                Top-K: {local.topK}
              </span>
              <input
                type="range"
                min={1}
                max={20}
                value={local.topK}
                onChange={(e) => setLocal({ ...local, topK: Number(e.target.value) })}
                className="mt-2 w-full accent-[#ccff00]"
              />
            </label>
            <label className="block">
              <span className="font-mono text-xs uppercase text-gray-500">
                Similarity Threshold: {local.similarityThreshold}
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={local.similarityThreshold}
                onChange={(e) =>
                  setLocal({ ...local, similarityThreshold: Number(e.target.value) })
                }
                className="mt-2 w-full accent-[#ccff00]"
              />
            </label>
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 font-semibold">Model & Theme</h3>
          <div className="space-y-4">
            <label className="block">
              <span className="font-mono text-xs uppercase text-gray-500">Embedding Model</span>
              <input
                value={local.embeddingModel}
                onChange={(e) => setLocal({ ...local, embeddingModel: e.target.value })}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">Display only - backend controls actual model</p>
            </label>
            <label className="block">
              <span className="font-mono text-xs uppercase text-gray-500">Theme</span>
              <select
                value={local.theme}
                onChange={(e) => setLocal({ ...local, theme: e.target.value })}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
              >
                <option value="obsidian">Obsidian</option>
              </select>
            </label>
          </div>

          <div className="mt-8 flex gap-3">
            <Button onClick={save}>Save Settings</Button>
            <Button variant="secondary" onClick={reset}>Reset</Button>
          </div>

          <p className="mt-6 rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 text-xs text-orange-300">
            Clear Vector Database requires a backend API and is not yet connected.
          </p>
        </Card>
      </div>
    </div>
  );
}
