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
    createdAt: null,
    provider: null,
    avatar: null,
  };

  const joinedDate =
    displayUser.createdAt || displayUser.joinedAt || null;

  const providerName = displayUser.provider
    ? displayUser.provider.charAt(0).toUpperCase() +
      displayUser.provider.slice(1)
    : null;

  return (
    <div className="fade-in">
      <PageHeader
        title="Profile"
        description="User profile and session statistics."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-neon/10">
            {displayUser.avatar ? (
              <img
                src={displayUser.avatar}
                alt={displayUser.name}
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <User
                className="text-neon"
                size={36}
              />
            )}
          </div>

          <h2 className="text-xl font-bold">
            {displayUser.name}
          </h2>

          <p className="mt-1 text-sm text-gray-400">
            {displayUser.email}
          </p>

          {providerName && (
            <Badge
              variant="neon"
              className="mt-3"
            >
              via {providerName}
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
            <StatCard
              label="Uploads"
              value={uploadHistory.length}
              sub="This session"
            />

            <StatCard
              label="AI Queries"
              value={
                chatMessages.filter(
                  (m) => m.role === "user"
                ).length
              }
              sub="This session"
            />

            <StatCard
              label="Joined"
              value={
                joinedDate
                  ? formatDate(joinedDate)
                  : "--"
              }
              sub="Account created"
              icon={Calendar}
            />
          </div>

          <Card>
            <h3 className="mb-4 font-semibold">
              Personal Information
            </h3>

            <dl className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Mail
                  size={16}
                  className="text-gray-500"
                />

                <dt className="text-gray-500">
                  Email
                </dt>

                <dd className="ml-auto">
                  {displayUser.email}
                </dd>
              </div>

              <div className="flex items-center gap-3">
                <Shield
                  size={16}
                  className="text-gray-500"
                />

                <dt className="text-gray-500">
                  Provider
                </dt>

                <dd className="ml-auto capitalize">
                  {displayUser.provider || "--"}
                </dd>
              </div>

              <div className="flex items-center gap-3">
                <Calendar
                  size={16}
                  className="text-gray-500"
                />

                <dt className="text-gray-500">
                  Joined
                </dt>

                <dd className="ml-auto">
                  {joinedDate
                    ? formatDate(joinedDate)
                    : "--"}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}