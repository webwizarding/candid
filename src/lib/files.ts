import { toast } from "sonner";

export async function downloadFile(
  name: string,
  value: string | Blob,
  type = "application/json",
) {
  try {
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      const [{ save }, { writeTextFile, writeFile }] = await Promise.all([
        import("@tauri-apps/plugin-dialog"),
        import("@tauri-apps/plugin-fs"),
      ]);
      const path = await save({ defaultPath: name });
      if (!path) return false;
      if (typeof value === "string") await writeTextFile(path, value);
      else await writeFile(path, new Uint8Array(await value.arrayBuffer()));
      return true;
    }
    const url = URL.createObjectURL(
      typeof value === "string" ? new Blob([value], { type }) : value,
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return true;
  } catch {
    toast.error(
      "The file could not be saved. Choose a writable location and try again.",
    );
    return false;
  }
}
export async function readSmallFile(file: File, max = 2000000) {
  if (file.size > max)
    throw new Error(`Choose a file under ${max / 1000000} MB.`);
  return file.text();
}
