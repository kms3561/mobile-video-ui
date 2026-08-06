type UploadListener = () => void;

const mediaUploadListeners = new Set<UploadListener>();

export function subscribeToMediaUploads(listener: UploadListener) {
  mediaUploadListeners.add(listener);

  return () => {
    mediaUploadListeners.delete(listener);
  };
}

export function notifyMediaUploadComplete() {
  for (const listener of mediaUploadListeners) {
    listener();
  }
}
