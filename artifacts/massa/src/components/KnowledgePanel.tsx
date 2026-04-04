import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from "react";
import { cn } from "@/lib/utils";

interface KnowledgeFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
}

interface KnowledgePanelProps {
  projectId: string;
  files: KnowledgeFile[];
  onAddFiles: (projectId: string, files: KnowledgeFile[]) => void;
  onRemoveFile: (projectId: string, fileId: string) => void;
}

const ACCEPTED_EXTENSIONS = ".pdf,.txt,.md,.png,.jpg,.jpeg,.gif,.csv,.json,.xml,.yaml,.yml,.doc,.docx,.xls,.xlsx";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getTypeIcon(type: string): string {
  if (type.startsWith("image/")) return "🖼";
  if (type === "application/pdf") return "📄";
  if (type === "application/json") return "{ }";
  if (type === "text/csv") return "📊";
  if (type.includes("spreadsheet") || type.includes("excel")) return "📊";
  if (type.includes("word") || type.includes("document")) return "📝";
  return "📎";
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function KnowledgePanel({ projectId, files, onAddFiles, onRemoveFile }: KnowledgePanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const processFiles = useCallback(
    (fileList: FileList) => {
      const newFiles: KnowledgeFile[] = Array.from(fileList).map((f) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: f.name,
        size: f.size,
        type: f.type || "application/octet-stream",
        uploadedAt: new Date(),
      }));
      onAddFiles(projectId, newFiles);
    },
    [projectId, onAddFiles]
  );

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleFileInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
        e.target.value = "";
      }
    },
    [processFiles]
  );

  return (
    <div className="flex flex-col h-full px-6 py-5 gap-5">
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 cursor-pointer transition-colors",
          isDragging
            ? "border-emerald-400 bg-emerald-400/[0.06]"
            : "border-[#252a35] bg-[#0d1117] hover:border-[#3a4050] hover:bg-[#0f141c]"
        )}
      >
        <span className="text-2xl opacity-60">↑</span>
        <p className="text-xs font-mono text-[#7a8294] text-center">
          {isDragging ? (
            <span className="text-emerald-400">Drop files here</span>
          ) : (
            <>
              Drag & drop files here, or{" "}
              <span className="text-emerald-400 underline underline-offset-2">browse</span>
            </>
          )}
        </p>
        <p className="text-[10px] font-mono text-[#4a5060]">
          PDF, TXT, MD, images, CSV, JSON, and more
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {files.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs font-mono text-[#4a5060]">No files uploaded yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1 overflow-y-auto flex-1">
          <p className="text-[10px] font-mono text-[#4a5060] uppercase tracking-widest mb-1">
            {files.length} file{files.length !== 1 ? "s" : ""}
          </p>
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 px-3 py-2 rounded-md bg-[#0d1117] border border-[#1a1f2b] hover:border-[#252a35] group transition-colors"
            >
              <span className="text-sm w-5 text-center shrink-0 opacity-70">
                {getTypeIcon(file.type)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono text-[#c0c5cf] truncate">{file.name}</p>
                <p className="text-[10px] font-mono text-[#4a5060]">
                  {formatFileSize(file.size)} · {formatDate(file.uploadedAt)}
                </p>
              </div>
              <button
                onClick={() => onRemoveFile(projectId, file.id)}
                className="text-[#4a5060] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-mono px-1"
                title="Remove file"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export type { KnowledgeFile };
