import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { FileText, Trash2 } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import Card from "../components/common/Card";
import StatCard from "../components/common/StatCard";
import UploadBox from "../components/upload/UploadBox";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";
import { uploadPdf } from "../services/pdf.service";
import { addUpload, clearHistory } from "../store/slices/uploadSlice";
import { formatDate, formatBytes } from "../utils/formatters";

export default function Upload() {
  const dispatch = useDispatch();
  const { history, lastUpload } = useSelector((s) => s.upload);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = async (file) => {
    setLoading(true);
    setProgress(0);
    try {
      const res = await uploadPdf(file, setProgress);
      dispatch(
        addUpload({
          name: file.name,
          fileName: file.name,
          size: file.size,
          totalChunks: res.data.totalChunks,
          storedVectors: res.data.storedVectors,
        })
      );
      toast.success(res.data.message || "Document embedded successfully");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="fade-in">
      <PageHeader
        title="Document Upload"
        description="Upload PDFs to chunk, embed, and store vectors for RAG-powered search."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Last Upload Chunks"
          value={lastUpload?.totalChunks ?? "--"}
          sub="From most recent PDF"
        />
        <StatCard
          label="Stored Vectors"
          value={lastUpload?.storedVectors ?? "--"}
          sub="Total in database"
        />
        <StatCard
          label="Session Uploads"
          value={history.length}
          sub="Local session history"
        />
      </div>

      <UploadBox onUpload={handleUpload} loading={loading} progress={progress} />

      <Card className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Upload History</h3>
          <p className="font-mono text-xs text-gray-500">Session only - not persisted on server</p>
          {history.length > 0 && (
            <Button variant="ghost" onClick={() => dispatch(clearHistory())}>
              <Trash2 size={14} />
              Clear
            </Button>
          )}
        </div>

        {history.length === 0 ? (
          <p className="text-sm text-gray-500">No uploads in this session yet.</p>
        ) : (
          <ul className="space-y-3">
            {history.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-xl bg-white/[0.02] px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <FileText className="text-neon" size={18} />
                  <div>
                    <p className="text-sm font-medium">{item.fileName}</p>
                    <p className="font-mono text-xs text-gray-500">
                      {formatBytes(item.size)} - {formatDate(item.uploadedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge>{item.totalChunks} chunks</Badge>
                  <Badge variant="neon">{item.storedVectors} vectors</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
