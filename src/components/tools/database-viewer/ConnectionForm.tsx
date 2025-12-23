import { useState } from "react";
import { CheckCircle, XCircle, Loader2, FolderOpen } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { useDatabaseViewerStore } from "@/stores/databaseViewerStore";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import type { ConnectionConfig, DatabaseType } from "@/types";

interface ConnectionFormProps {
  connection: ConnectionConfig | null;
  onClose: () => void;
}

export function ConnectionForm({ connection, onClose }: ConnectionFormProps) {
  const { addConnection, updateConnection, testConnection } = useDatabaseViewerStore();

  const [name, setName] = useState(connection?.name || "");
  const [type, setType] = useState<DatabaseType>(connection?.type || "sqlite");
  const [filePath, setFilePath] = useState(connection?.filePath || "");
  const [host, setHost] = useState(connection?.host || "localhost");
  const [port, setPort] = useState(connection?.port || (type === "postgres" ? 5432 : 3306));
  const [database, setDatabase] = useState(connection?.database || "");
  const [username, setUsername] = useState(connection?.username || "");
  const [password, setPassword] = useState(connection?.password || "");
  const [ssl, setSsl] = useState(connection?.ssl || false);
  const [isSupabase, setIsSupabase] = useState(connection?.isSupabase || false);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  const handleTypeChange = (newType: DatabaseType) => {
    setType(newType);
    if (newType === "postgres") {
      setPort(5432);
    } else if (newType === "mysql") {
      setPort(3306);
    }
  };

  const handleBrowseFile = async () => {
    const selected = await open({
      multiple: false,
      filters: [
        { name: "SQLite Database", extensions: ["db", "sqlite", "sqlite3"] },
      ],
    });
    if (selected) {
      setFilePath(selected as string);
    }
  };

  const buildConfig = (): ConnectionConfig => ({
    id: connection?.id || "",
    name,
    type,
    filePath: type === "sqlite" ? filePath : undefined,
    host: type !== "sqlite" ? host : undefined,
    port: type !== "sqlite" ? port : undefined,
    database: type !== "sqlite" ? database : undefined,
    username: type !== "sqlite" ? username : undefined,
    password: type !== "sqlite" ? password : undefined,
    ssl: type !== "sqlite" ? ssl : undefined,
    isSupabase: type === "postgres" ? isSupabase : undefined,
  });

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const config = buildConfig();
    const result = await testConnection(config);
    setTestResult(result ? "success" : "error");
    setTesting(false);
  };

  const handleSave = () => {
    const config = buildConfig();
    if (connection) {
      updateConnection(connection.id, config);
    } else {
      addConnection(config);
    }
    onClose();
  };

  const isValid = name && (type === "sqlite" ? filePath : host && database);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={connection ? "Edit Connection" : "New Connection"}
      size="md"
    >
      <div className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Connection Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Database"
            className="w-full px-3 py-2 rounded-md bg-bg-tertiary border border-border focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Database Type</label>
          <div className="flex gap-2">
            {(["sqlite", "postgres", "mysql"] as DatabaseType[]).map((t) => (
              <button
                key={t}
                onClick={() => handleTypeChange(t)}
                className={cn(
                  "flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  type === t
                    ? "bg-accent text-[#3d2066]"
                    : "bg-bg-tertiary hover:bg-bg-hover"
                )}
              >
                {t === "sqlite" ? "SQLite" : t === "postgres" ? "PostgreSQL" : "MySQL"}
              </button>
            ))}
          </div>
        </div>

        {type === "sqlite" ? (
          <div>
            <label className="block text-sm font-medium mb-1">Database File</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="/path/to/database.db"
                className="flex-1 px-3 py-2 rounded-md bg-bg-tertiary border border-border focus:border-accent focus:outline-none"
              />
              <button
                onClick={handleBrowseFile}
                className="px-3 py-2 rounded-md bg-bg-tertiary hover:bg-bg-hover border border-border"
              >
                <FolderOpen className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {type === "postgres" && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="supabase"
                  checked={isSupabase}
                  onChange={(e) => setIsSupabase(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="supabase" className="text-sm">
                  This is a Supabase database
                </label>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Host</label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="localhost"
                  className="w-full px-3 py-2 rounded-md bg-bg-tertiary border border-border focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Port</label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-md bg-bg-tertiary border border-border focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Database</label>
              <input
                type="text"
                value={database}
                onChange={(e) => setDatabase(e.target.value)}
                placeholder="mydb"
                className="w-full px-3 py-2 rounded-md bg-bg-tertiary border border-border focus:border-accent focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="user"
                  className="w-full px-3 py-2 rounded-md bg-bg-tertiary border border-border focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="******"
                  className="w-full px-3 py-2 rounded-md bg-bg-tertiary border border-border focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ssl"
                checked={ssl}
                onChange={(e) => setSsl(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="ssl" className="text-sm">
                Use SSL/TLS connection
              </label>
            </div>
          </>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <button
            onClick={handleTest}
            disabled={!isValid || testing}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium",
              "bg-bg-tertiary hover:bg-bg-hover disabled:opacity-50"
            )}
          >
            {testing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : testResult === "success" ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : testResult === "error" ? (
              <XCircle className="w-4 h-4 text-red-500" />
            ) : null}
            Test Connection
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm font-medium bg-bg-tertiary hover:bg-bg-hover"
            >
              Cancel
            </button>
            <button onClick={handleSave} disabled={!isValid} className="btn-primary">
              {connection ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
