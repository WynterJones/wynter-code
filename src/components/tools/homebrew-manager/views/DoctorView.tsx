import { Stethoscope, AlertTriangle, AlertCircle, CheckCircle, Play, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useHomebrewStore } from "@/stores/homebrewStore";

export function DoctorView() {
  const { doctorResult, isLoading, isOperating, runDoctor, cleanup } = useHomebrewStore();

  const handleCleanup = async () => {
    const output = await cleanup(false);
    if (output) {
      // Refresh doctor after cleanup
      runDoctor();
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Run doctor button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-text-tertiary" />
          <span className="font-medium text-text-primary">Homebrew Doctor</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleCleanup}
            disabled={isLoading || isOperating}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Cleanup
          </Button>
          <Button onClick={() => runDoctor()} disabled={isLoading || isOperating}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Run Doctor
          </Button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      )}

      {/* Results */}
      {!isLoading && doctorResult && (
        <div className="space-y-4">
          {/* Status banner */}
          <div
            className={`p-4 rounded-lg flex items-center gap-3 ${
              doctorResult.isHealthy
                ? "bg-green-500/10 border border-green-500/20"
                : "bg-orange-500/10 border border-orange-500/20"
            }`}
          >
            {doctorResult.isHealthy ? (
              <>
                <CheckCircle className="w-6 h-6 text-green-400" />
                <div>
                  <p className="font-medium text-green-400">Your system is ready to brew</p>
                  <p className="text-sm text-green-400/70">No issues detected</p>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle className="w-6 h-6 text-orange-400" />
                <div>
                  <p className="font-medium text-orange-400">
                    {doctorResult.issues.length + doctorResult.warnings.length} issue
                    {doctorResult.issues.length + doctorResult.warnings.length !== 1 ? "s" : ""}{" "}
                    found
                  </p>
                  <p className="text-sm text-orange-400/70">
                    Review the issues below for details
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Issues */}
          {doctorResult.issues.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Errors ({doctorResult.issues.length})
              </h3>
              <div className="space-y-2">
                {doctorResult.issues.map((issue, i) => (
                  <div
                    key={i}
                    className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
                  >
                    <p className="text-sm text-red-400 font-mono">{issue}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {doctorResult.warnings.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-orange-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Warnings ({doctorResult.warnings.length})
              </h3>
              <div className="space-y-2">
                {doctorResult.warnings.map((warning, i) => (
                  <div
                    key={i}
                    className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg"
                  >
                    <p className="text-sm text-orange-400 font-mono">{warning}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raw output */}
          {doctorResult.rawOutput && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-text-secondary">Raw Output</h3>
              <pre className="p-4 bg-bg-secondary rounded-lg border border-border text-xs text-text-tertiary font-mono overflow-auto max-h-64">
                {doctorResult.rawOutput}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Initial state */}
      {!isLoading && !doctorResult && (
        <div className="text-center py-12">
          <Stethoscope className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
          <p className="text-text-secondary">Run brew doctor to check your system</p>
          <p className="text-sm text-text-tertiary mt-1">
            This will identify potential issues with your Homebrew installation
          </p>
        </div>
      )}
    </div>
  );
}
