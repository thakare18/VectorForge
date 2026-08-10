import { ExternalLink, RefreshCw } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import { useSelector } from "react-redux";

export default function Swagger() {
  const { backendUrl } = useSelector((s) => s.settings);
  const docsUrl = `${backendUrl}/api-docs`;

  return (
    <div className="fade-in">
      <PageHeader
        title="API Documentation"
        description="Interactive Swagger UI for VectorForge backend endpoints."
        action={
          <a href={docsUrl} target="_blank" rel="noreferrer">
            <Button variant="secondary">
              <ExternalLink size={16} />
              Open in New Tab
            </Button>
          </a>
        }
      />

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <span className="font-mono text-xs text-gray-500">{docsUrl}</span>
          <Button
            variant="ghost"
            onClick={() => {
              const iframe = document.getElementById("swagger-frame");
              if (iframe) iframe.src = docsUrl;
            }}
          >
            <RefreshCw size={14} />
            Refresh
          </Button>
        </div>
        <iframe
          id="swagger-frame"
          src={docsUrl}
          title="Swagger API Docs"
          className="h-[calc(100vh-16rem)] w-full border-0 bg-white"
        />
      </Card>
    </div>
  );
}
