import { useRef, useState } from "react";
import { Upload, FileText } from "lucide-react";
import { validatePdfFile } from "../../utils/validators";
import { formatBytes } from "../../utils/formatters";
import Button from "../common/Button";

export default function UploadBox({ onUpload, loading, progress }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  const handleFile = (file) => {
    const validationError = validatePdfFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSelected(file);
    onUpload(file);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
      className={`glass-card flex flex-col items-center justify-center border-2 border-dashed p-12 text-center transition-colors ${
        dragOver ? "border-neon bg-neon/5" : "border-white/10"
      }`}
    >
      <div className="mb-4 rounded-full bg-neon/10 p-4">
        <Upload className="text-neon" size={32} />
      </div>
      <h3 className="text-lg font-semibold">Drop PDF here</h3>
      <p className="mt-1 text-sm text-gray-400">or browse to upload (max 10MB)</p>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <Button
        className="mt-6"
        onClick={() => inputRef.current?.click()}
        loading={loading}
        disabled={loading}
      >
        Browse PDF
      </Button>

      {selected && (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-400">
          <FileText size={16} />
          {selected.name} ({formatBytes(selected.size)})
        </div>
      )}

      {loading && (
        <div className="mt-4 w-full max-w-xs">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-neon transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 font-mono text-xs text-gray-500">
            Processing... {progress}%
          </p>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}
