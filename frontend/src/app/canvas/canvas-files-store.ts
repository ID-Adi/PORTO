import type { BinaryFiles } from "@excalidraw/excalidraw/types";

// File biner CanvasPawa (dataURL gambar / poster video) bisa beberapa MB,
// jadi disimpan di IndexedDB — bukan localStorage yang berkuota ~5MB.
const DB_NAME = "porto-canvas";
const STORE_NAME = "files";
const FILES_KEY = "scene";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = window.indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveLocalFiles(files: BinaryFiles): Promise<void> {
  if (typeof window === "undefined" || !window.indexedDB) return;
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(files, FILES_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Abaikan — iterasi berikutnya bisa berhasil.
  }
}

export async function loadLocalFiles(): Promise<BinaryFiles | null> {
  if (typeof window === "undefined" || !window.indexedDB) return null;
  try {
    const db = await openDB();
    const files = await new Promise<BinaryFiles | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(FILES_KEY);
      req.onsuccess = () => resolve((req.result as BinaryFiles) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return files;
  } catch {
    return null;
  }
}

export async function clearLocalFiles(): Promise<void> {
  if (typeof window === "undefined" || !window.indexedDB) return;
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(FILES_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Abaikan.
  }
}
