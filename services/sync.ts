
import { LearningArtifact } from "../types";

const DB_NAME = 'RustMentorSyncDB';
const STORE_NAME = 'Handles';
const HANDLE_KEY = 'syncFolderHandle';

// Open IndexedDB to store/retrieve directory handles
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveDirectoryHandle = async (handle: FileSystemDirectoryHandle) => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve(true);
  });
};

export const getDirectoryHandle = async (): Promise<FileSystemDirectoryHandle | null> => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const request = tx.objectStore(STORE_NAME).get(HANDLE_KEY);
  return new Promise((resolve) => {
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });
};

export const clearDirectoryHandle = async () => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(HANDLE_KEY);
};

export const syncArtifactToLocal = async (artifact: LearningArtifact, handle: FileSystemDirectoryHandle) => {
  try {
    // Request permission if not granted
    // @ts-ignore
    if ((await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
      // @ts-ignore
      if ((await handle.requestPermission({ mode: 'readwrite' })) !== 'granted') {
        throw new Error("Permission denied");
      }
    }

    const safeTitle = artifact.title.replace(/[<>:"/\\|?*]/g, '_');
    const fileName = `${artifact.date}-${safeTitle}.md`;
    
    const fileHandle = await handle.getFileHandle(fileName, { create: true });
    // @ts-ignore
    const writable = await fileHandle.createWritable();
    
    const content = `# ${artifact.title}\n\nDate: ${artifact.date}\nTags: ${artifact.tags.join(', ')}\n\n---\n\n${artifact.content}`;
    
    await writable.write(content);
    await writable.close();
    return true;
  } catch (error) {
    console.error("Local sync error:", error);
    return false;
  }
};
