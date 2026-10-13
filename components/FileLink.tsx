import { DOCUMENT_LABEL } from "@/lib/constants";

export const fileUrl = (f: { publicId: string; resourceType: string }) => `/api/files?publicId=${encodeURIComponent(f.publicId)}&type=${f.resourceType}`;

export function FileLink({ f }: { f: any }) {
  return (
    <a href={fileUrl(f)} target="_blank" rel="noopener noreferrer" className="text-forest-700 underline underline-offset-2">
      {DOCUMENT_LABEL[f.documentType] ?? f.documentType}: {f.fileName}
    </a>
  );
}
