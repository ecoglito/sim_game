"use client";

interface DownloadButtonProps {
  data: unknown;
  filename: string;
}

export function DownloadButton({ data, filename }: DownloadButtonProps) {
  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button onClick={handleDownload} className="btn-secondary text-sm">
      Download JSON
    </button>
  );
}

