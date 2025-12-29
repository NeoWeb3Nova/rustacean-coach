
import { LearningArtifact, GithubConfig } from "../types";

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
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(HANDLE_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
};

export const clearDirectoryHandle = async () => {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  transaction.objectStore(STORE_NAME).delete(HANDLE_KEY);
};

export const nukeDatabase = (): Promise<void> => {
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
  });
};

/**
 * 云同步：将成果同步到 GitHub Gist
 */
export const syncToGithubGist = async (artifact: LearningArtifact, config: GithubConfig): Promise<string | null> => {
  if (!config.token) return null;

  // Cleanup title and date for safe filename
  const safeTitle = artifact.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const safeDate = artifact.date.replace(/[^a-z0-9-]/gi, '-');
  const fileName = `${safeDate}-${safeTitle}.md`;

  const body = {
    description: `Rust Mentor Learning Artifact: ${artifact.title}`,
    public: false,
    files: {
      [fileName]: {
        content: artifact.content
      }
    }
  };

  const makeRequest = async (useGistId: string | undefined) => {
    const url = useGistId 
      ? `https://api.github.com/gists/${useGistId}` 
      : `https://api.github.com/gists`;
    
    const method = useGistId ? 'PATCH' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        // Using 'token' prefix as it's the standard for classic PATs mentioned in the UI
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // Fallback to status text
      }
      
      // Handle case where saved Gist ID no longer exists or is inaccessible
      if (response.status === 404 && useGistId) {
        console.warn(`Gist ID ${useGistId} not found or inaccessible. Clearing from local config.`);
        return null; // Signal to the caller to retry with a new Gist
      }
      
      throw new Error(`GitHub API Error (${response.status}): ${errorMessage}`);
    }
    
    return await response.json();
  };

  try {
    let data = null;
    
    // Validate Gist ID before using it
    const validGistId = config.gistId && config.gistId.trim().length > 5 ? config.gistId.trim() : null;

    if (validGistId) {
      data = await makeRequest(validGistId);
      
      // If data is null, the Gist was 404'd (deleted). 
      // We clear it from state/storage and fall back to creating a new one.
      if (!data) {
        const savedConfig = JSON.parse(localStorage.getItem('rust_github_config') || '{}');
        delete savedConfig.gistId;
        localStorage.setItem('rust_github_config', JSON.stringify(savedConfig));
        
        // Retry without Gist ID
        data = await makeRequest(undefined);
      }
    } else {
      data = await makeRequest(undefined);
    }

    if (data && data.id) {
      // Sync the latest Gist ID back to local storage
      const savedConfig = JSON.parse(localStorage.getItem('rust_github_config') || '{}');
      if (savedConfig.gistId !== data.id) {
        savedConfig.gistId = data.id;
        localStorage.setItem('rust_github_config', JSON.stringify(savedConfig));
      }
      return data.html_url;
    }

    return null;
  } catch (error: any) {
    console.error("Cloud sync failed:", error.message);
    alert(`Cloud Sync Error: ${error.message}`);
    return null;
  }
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
    const safeDate = artifact.date.replace(/[^a-z0-9-]/gi, '-');
    const fileName = `${safeDate}-${safeTitle}.md`;
    const fileHandle = await handle.getFileHandle(fileName, { create: true });
    
    // @ts-ignore
    const writable = await fileHandle.createWritable();
    await writable.write(artifact.content);
    await writable.close();
    return true;
  } catch (error) {
    console.error("Local sync error:", error);
    return false;
  }
};

export const triggerDownload = (artifact: LearningArtifact) => {
  const safeTitle = artifact.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const safeDate = artifact.date.replace(/[^a-z0-9-]/gi, '-');
  const fileName = `${safeDate}-${safeTitle}.md`;
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
