import { FileCode2, FileSpreadsheet, FileText } from "lucide-react";

export interface FileIconProps {
  extension: string;
  className?: string;
}

export function FileIcon({ extension, className = "h-5 w-5" }: FileIconProps) {
  const normalizedExtension = extension.toUpperCase();

  if (normalizedExtension === "PDF") {
    return <FileText className={`${className} text-danger`} />;
  }

  if (normalizedExtension === "XLSX" || normalizedExtension === "XLS") {
    return <FileSpreadsheet className={`${className} text-success`} />;
  }

  return <FileCode2 className={`${className} text-info`} />;
}
