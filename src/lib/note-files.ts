import { strFromU8, strToU8, zipSync, Unzip, UnzipInflate } from "fflate";
import { notePath, NOTE_LIMIT, VAULT_LIMIT, type Note } from "./notes";
export function exportVault(notes: Note[]) {
  const files: Record<string, Uint8Array> = {};
  for (const note of notes.filter((n) => !n.deletedAt))
    files[note.path] = strToU8(note.body);
  return zipSync(files, { level: 6 });
}
export async function importVault(
  bytes: Uint8Array,
): Promise<Array<{ path: string; body: string }>> {
  if (bytes.length > 10_000_000)
    throw new Error("Choose a vault ZIP under 10 MB.");
  return new Promise((resolve, reject) => {
    const notes: Array<{ path: string; body: string }> = [];
    let total = 0;
    let failed = false;
    let files = 0;
    const abort = (message: string) => {
      failed = true;
      reject(new Error(message));
    };
    const unzip = new Unzip((file) => {
      if (++files > 2000) {
        abort("Too many files in this ZIP.");
        return;
      }
      if (
        !/\.md$/i.test(file.name) ||
        file.name.split("/").some((p) => p.startsWith(".")) ||
        file.name.startsWith("__MACOSX/")
      )
        return;
      let path: string;
      try {
        path = notePath(file.name);
      } catch {
        abort("The ZIP contains an unsafe note path.");
        return;
      }
      if (file.originalSize && file.originalSize > NOTE_LIMIT * 4) {
        abort("A note exceeds the import size limit.");
        return;
      }
      let size = 0;
      const chunks: Uint8Array[] = [];
      file.ondata = (error, chunk, final) => {
        if (error) {
          abort("The ZIP could not be decoded.");
          return;
        }
        if (failed) {
          file.terminate();
          return;
        }
        size += chunk.length;
        total += chunk.length;
        if (
          size > NOTE_LIMIT * 4 ||
          total > VAULT_LIMIT ||
          notes.length >= 1000
        ) {
          file.terminate();
          abort("The vault exceeds the 4 MB or 1,000-note import limit.");
          return;
        }
        chunks.push(chunk);
        if (final) {
          const data = new Uint8Array(size);
          let offset = 0;
          for (const part of chunks) {
            data.set(part, offset);
            offset += part.length;
          }
          const body = strFromU8(data);
          if (body.length > NOTE_LIMIT) {
            abort("A note exceeds 100,000 characters.");
            return;
          }
          notes.push({ path, body });
        }
      };
      file.start();
    });
    unzip.register(UnzipInflate);
    try {
      // Bound each inflater push as well as total decompressed output.
      for (let offset = 0; offset < bytes.length && !failed; offset += 1024)
        unzip.push(
          bytes.subarray(offset, offset + 1024),
          offset + 1024 >= bytes.length,
        );
      if (!failed) {
        if (!notes.length) abort("This ZIP contains no Markdown notes.");
        else resolve(notes);
      }
    } catch {
      abort("The ZIP is invalid or incomplete.");
    }
  });
}
