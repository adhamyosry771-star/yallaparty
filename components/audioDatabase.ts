// Clean IndexedDB helper functions to keep local audio blobs persistent across app updates and page reloads

export const openAudioDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("YallaPartyAudioDB", 2);
    request.onupgradeneeded = (e: any) => {
      const db = request.result;
      if (!db.objectStoreNames.contains("tracks")) {
        db.createObjectStore("tracks", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveTrackToDB = async (track: { id: string; name: string; blob: Blob; duration: number; roomId: string; userId?: string }) => {
  try {
    const db = await openAudioDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction("tracks", "readwrite");
      const store = tx.objectStore("tracks");
      store.put(track);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error("IndexedDB save failed", e);
  }
};

export const deleteTrackFromDB = async (id: string) => {
  try {
    const db = await openAudioDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction("tracks", "readwrite");
      const store = tx.objectStore("tracks");
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error("IndexedDB delete failed", e);
  }
};

export const loadTracksFromDBForUser = async (userId: string): Promise<any[]> => {
  try {
    const db = await openAudioDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("tracks", "readonly");
      const store = tx.objectStore("tracks");
      const req = store.getAll();
      req.onsuccess = () => {
        const all = req.result || [];
        const filtered = all.filter((item: any) => item.userId === userId);
        const tracks = filtered.map((item: any) => ({
          id: item.id,
          name: item.name,
          src: URL.createObjectURL(item.blob),
          isLocal: true,
          duration: item.duration || 180,
          blob: item.blob
        }));
        resolve(tracks);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error("IndexedDB load failed", e);
    return [];
  }
};

export const loadTracksFromDBForRoom = async (roomId: string): Promise<any[]> => {
  try {
    const db = await openAudioDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("tracks", "readonly");
      const store = tx.objectStore("tracks");
      const req = store.getAll();
      req.onsuccess = () => {
        const all = req.result || [];
        const tracks = all.map((item: any) => ({
          id: item.id,
          name: item.name,
          src: URL.createObjectURL(item.blob),
          isLocal: true,
          duration: item.duration || 180,
          blob: item.blob
        }));
        resolve(tracks);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error("IndexedDB load failed", e);
    return [];
  }
};

export const getAudioDuration = (file: Blob): Promise<number> => {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const audio = new Audio();
    audio.src = objectUrl;
    
    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      audio.removeEventListener('loadedmetadata', onLoad);
      audio.removeEventListener('error', onError);
    };

    const onLoad = () => {
      const dur = audio.duration;
      cleanup();
      if (dur && !isNaN(dur) && isFinite(dur)) {
        resolve(dur);
      } else {
        resolve(180);
      }
    };

    const onError = () => {
      cleanup();
      resolve(180);
    };

    audio.addEventListener('loadedmetadata', onLoad);
    audio.addEventListener('error', onError);
  });
};
