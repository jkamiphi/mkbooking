"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "mk-face-selection";

export interface SelectedFace {
  id: string;
  title: string;
  location: string;
  imageUrl: string | null;
  priceLabel: string | null;
  structureType: string;
}

interface FaceSelectionContextValue {
  selectedFaces: SelectedFace[];
  selectionCount: number;
  isSelected: (faceId: string) => boolean;
  addFace: (face: SelectedFace) => void;
  removeFace: (faceId: string) => void;
  toggleFace: (face: SelectedFace) => void;
  clearSelection: () => void;
}

const FaceSelectionContext = createContext<FaceSelectionContextValue | null>(null);

function loadFromStorage(): SelectedFace[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(faces: SelectedFace[]) {
  if (typeof window === "undefined") return;
  try {
    if (faces.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(faces));
    }
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

export function FaceSelectionProvider({ children }: { children: React.ReactNode }) {
  const [faces, setFaces] = useState<SelectedFace[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setFaces(loadFromStorage());
    setIsHydrated(true);
  }, []);

  // Persist to localStorage on change (skip initial render)
  useEffect(() => {
    if (!isHydrated) return;
    saveToStorage(faces);
  }, [faces, isHydrated]);

  const selectedIds = useMemo(() => new Set(faces.map((f) => f.id)), [faces]);

  const isSelected = useCallback(
    (faceId: string) => selectedIds.has(faceId),
    [selectedIds]
  );

  const addFace = useCallback((face: SelectedFace) => {
    setFaces((prev) => {
      if (prev.some((f) => f.id === face.id)) return prev;
      return [...prev, face];
    });
  }, []);

  const removeFace = useCallback((faceId: string) => {
    setFaces((prev) => prev.filter((f) => f.id !== faceId));
  }, []);

  const toggleFace = useCallback(
    (face: SelectedFace) => {
      if (selectedIds.has(face.id)) {
        removeFace(face.id);
      } else {
        addFace(face);
      }
    },
    [selectedIds, addFace, removeFace]
  );

  const clearSelection = useCallback(() => {
    setFaces([]);
  }, []);

  const value = useMemo<FaceSelectionContextValue>(
    () => ({
      selectedFaces: faces,
      selectionCount: faces.length,
      isSelected,
      addFace,
      removeFace,
      toggleFace,
      clearSelection,
    }),
    [faces, isSelected, addFace, removeFace, toggleFace, clearSelection]
  );

  return (
    <FaceSelectionContext.Provider value={value}>
      {children}
    </FaceSelectionContext.Provider>
  );
}

export function useFaceSelection() {
  const context = useContext(FaceSelectionContext);
  if (!context) {
    throw new Error("useFaceSelection must be used within a FaceSelectionProvider");
  }
  return context;
}
