
import { LearningArtifact } from "../types";

const DB_NAME = 'RustMentorSyncDB';
const STORE_NAME = 'Handles';
const HANDLE_KEY = 'syncFolderHandle';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveDirectoryHandle = async (handle: FileSystemDirectoryHandle) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(handle, HANDLE_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getDirectoryHandle = async (): Promise<FileSystemDirectoryHandle | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(HANDLE_KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null); // Return null instead of rejecting
  });
};

export const clearDirectoryHandle = async () => {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  transaction.objectStore(STORE_NAME).delete(HANDLE_KEY);
};

export const syncArtifactToLocal = async (artifact: LearningArtifact, handle: FileSystemDirectoryHandle): Promise<boolean> => {
  try {
    // @ts-ignore
    const permissionStatus = await handle.queryPermission({ mode: 'readwrite' });
    if (permissionStatus !== 'granted') {
      // @ts-ignore
      const requestStatus = await handle.requestPermission({ mode: 'readwrite' });
      if (requestStatus !== 'granted') return false;
    }

    const safeTitle = artifact.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `${artifact.date}-${safeTitle}.md`;
    const fileHandle = await handle.getFileHandle(fileName, { create: true });
    
    // @ts-ignore
    const writable = await fileHandle.createWritable();
    await writable.write(artifact.content);
    await writable.close();
    return true;
  } catch (error) {
    console.error("Sync error:", error);
    return false;
  }
};

/**
 * Fallback to manual download if the File System Access API is blocked.
 */
export const triggerDownload = (artifact: LearningArtifact) => {
  const safeTitle = artifact.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const fileName = `${artifact.date}-${safeTitle}.md`;
  const blob = new Blob([artifact.content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
