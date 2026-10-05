import { REAL_DATA } from "./data";

const STORAGE_KEY = "library-insight-local-data-v1";
const UPLOAD_HISTORY_KEY = "library-insight-upload-history-v1";

export function loadLocalData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return structuredClone(REAL_DATA);
    }

    return JSON.parse(saved);
  } catch (error) {
    console.error("Failed to load local data:", error);
    return structuredClone(REAL_DATA);
  }
}

export function saveLocalData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function resetLocalData() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(UPLOAD_HISTORY_KEY);
  window.location.reload();
}

export function loadUploadHistory() {
  try {
    return JSON.parse(
      localStorage.getItem(UPLOAD_HISTORY_KEY) || "[]"
    );
  } catch {
    return [];
  }
}

export function saveUploadHistory(history) {
  localStorage.setItem(
    UPLOAD_HISTORY_KEY,
    JSON.stringify(history)
  );
}

export function addUploadHistory(record) {
  const history = loadUploadHistory();

  history.unshift(record);

  saveUploadHistory(history.slice(0, 50));
}