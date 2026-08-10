import { useSelector } from "react-redux";
import { User, Mail, Calendar, Shield } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import Card from "../components/common/Card";
import StatCard from "../components/common/StatCard";
import Badge from "../components/common/Badge";
import { formatDate } from "../utils/formatters";

export default function Profile() {
  const { user, isAuthenticated } = useSelector((s) => s.auth);
  const uploadHistory = useSelector((s) => s.upload.history);
  const chatMessages = useSelector((s) => s.chat.messages);

  const displayUser = user || {
    name: "Guest User",
    email: "Not signed in",
    joinedAt: null,
    provider: null,
  };

  return (
    <div className="fade-in">
      <PageHeader
        title="Profile"
        description="User profile and session statistics. Full auth backend integration is planned."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-neon/10">
            <User className="text-neon" size={36} />
          </div>
          <h2 className="text-xl font-bold">{displayUser.name}</h2>
          <p className="mt-1 text-sm text-gray-400">{displayUser.email}</p>
          {displayUser.provider && (
            <Badge variant="neon" className="mt-3">
              via {displayUser.provider}
            </Badge>
          )}
          {!isAuthenticated && (
            <p className="mt-4 text-xs text-gray-500">
              Sign in to enable profile persistence
            </p>
          )}
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Uploads" value={uploadHistory.length} sub="This session" />
            <StatCard label="AI Queries" value={chatMessages.filter((m) => m.role === "user").length} sub="This session" />
            <StatCard
              label="Joined"
              value={displayUser.joinedAt ? formatDate(displayUser.joinedAt) : "--"}
              sub="Account created"
              icon={Calendar}
            />
          </div>

          <Card>
            <h3 className="mb-4 font-semibold">Personal Information</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-gray-500" />
                <dt className="text-gray-500">Email</dt>
                <dd className="ml-auto">{displayUser.email}</dd>
              </div>
              <div className="flex items-center gap-3">
                <Shield size={16} className="text-gray-500" />
                <dt className="text-gray-500">Security</dt>
                <dd className="ml-auto text-gray-400">Change password - coming soon</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
