import { PDFDocument } from "pdf-lib";

export type PdfChunk = {
  buffer: Buffer;
  startPage: number; // 원본 문서에서 이 조각의 첫 페이지 번호 (1-indexed)
};

/**
 * 큰 PDF를 여러 조각으로 나눈다. 조각 하나가 targetChunkBytes를 넘지 않도록
 * 페이지당 평균 용량을 계산해서 조각당 페이지 수를 자동으로 정함.
 * 각 조각의 원본 문서 기준 시작 페이지 번호도 같이 반환 (페이지 번호를 원본 기준으로
 * 환산할 때 필요).
 */
export async function splitPdfIntoChunks(
  buffer: Buffer,
  targetChunkBytes = 8 * 1024 * 1024
): Promise<PdfChunk[]> {
  const src = await PDFDocument.load(buffer);
  const totalPages = src.getPageCount();

  if (totalPages <= 1) return [{ buffer, startPage: 1 }];

  const bytesPerPage = buffer.length / totalPages;
  const pagesPerChunk = Math.max(1, Math.min(15, Math.floor(targetChunkBytes / bytesPerPage) || 1));

  const chunks: PdfChunk[] = [];
  for (let start = 0; start < totalPages; start += pagesPerChunk) {
    const end = Math.min(start + pagesPerChunk, totalPages);
    const indices = Array.from({ length: end - start }, (_, i) => start + i);

    const chunkDoc = await PDFDocument.create();
    const copiedPages = await chunkDoc.copyPages(src, indices);
    copiedPages.forEach((p) => chunkDoc.addPage(p));

    const chunkBytes = await chunkDoc.save();
    chunks.push({ buffer: Buffer.from(chunkBytes), startPage: start + 1 });
  }

  return chunks;
}
