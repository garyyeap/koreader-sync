import type { DocumentRow, ProgressResponse } from "./types";

export function toProgressResponse(row: DocumentRow): ProgressResponse {
  return {
    document: row.document,
    progress: row.progress,
    percentage: row.percentage,
    device: row.device,
    device_id: row.device_id,
    timestamp: row.timestamp,
  };
}
