import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useStripboardStore } from '@/store/stripboard';
import { clearAllAutosaves, noteCrash, getAutosaveBackup, hasAutosaveBackup } from '@/lib/autosave';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    noteCrash();
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  private download(text: string, name: string) {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  private handleDownload = () => {
    try {
      const data = useStripboardStore.getState().exportProject();
      this.download(JSON.stringify(data, null, 2), 'stripboard-project.json');
    } catch (err) {
      console.error('Failed to export project from error screen:', err);
    }
  };

  private handleDownloadBackup = () => {
    const raw = getAutosaveBackup();
    if (raw) this.download(raw, 'stripboard-autosave-backup.json');
  };

  private handleNewProject = () => {
    if (!confirm('Start a new project? This discards the saved autosave.')) return;
    clearAllAutosaves();
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="w-screen h-screen flex items-center justify-center bg-[#09090b]">
        <div className="bg-[#1a1a22] border border-[#2a2a34] rounded-xl shadow-2xl shadow-black/50 p-5 max-w-md mx-4">
          <h2 className="text-sm font-semibold text-[#ededf0] mb-2">
            Something went wrong.
          </h2>
          <p className="text-xs text-[#8a8a9a] font-mono break-words mb-4">
            {error.message}
          </p>
          <div className="flex gap-2 justify-end flex-wrap">
            {hasAutosaveBackup() && (
              <button
                onClick={this.handleDownloadBackup}
                className="px-3 py-1.5 text-xs rounded-lg bg-[#2a2a34] text-[#ededf0] hover:bg-[#34343f] transition-colors"
              >
                Download autosave
              </button>
            )}
            <button
              onClick={this.handleNewProject}
              className="px-3 py-1.5 text-xs rounded-lg bg-[#2a2a34] text-[#ededf0] hover:bg-[#34343f] transition-colors"
            >
              Start a new project
            </button>
            <button
              onClick={this.handleDownload}
              className="px-3 py-1.5 text-xs rounded-lg bg-[#2a2a34] text-[#ededf0] hover:bg-[#34343f] transition-colors"
            >
              Download project
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1.5 text-xs rounded-lg bg-[#c8ff2e] text-[#09090b] font-semibold hover:brightness-110 transition"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
