"use client";

import { useState, useCallback } from "react";
import { nanoid } from "@/lib/utils";
import {
  BeamEditorState,
  BeamSupport,
  BeamLoad,
  BeamValidationError,
  SNAP_INCREMENT,
} from "@/lib/types/beamEditor";
import { validateBeamEditor } from "@/lib/validation/beamValidation";

export function useBeamEditor(initialState?: Partial<BeamEditorState>) {
  const [state, setState] = useState<BeamEditorState>({
    length: initialState?.length || 10,
    ei: initialState?.ei || 50000,
    supports: initialState?.supports || [],
    loads: initialState?.loads || [],
  });

  const [errors, setErrors] = useState<BeamValidationError[]>([]);

  // Validate whenever state changes
  const validate = useCallback(() => {
    const validationErrors = validateBeamEditor(state);
    setErrors(validationErrors);
    return validationErrors.length === 0;
  }, [state]);

  // Geometry setters
  const setLength = useCallback((length: number) => {
    setState((prev) => ({ ...prev, length: Math.max(0.1, length) }));
  }, []);

  const setEI = useCallback((ei: number) => {
    setState((prev) => ({ ...prev, ei: Math.max(1, ei) }));
  }, []);

  // Support management
  const addSupport = useCallback(
    (type: BeamSupport["type"], position: number) => {
      const clampedPosition = Math.max(0, Math.min(state.length, position));
      const newSupport: BeamSupport = {
        id: nanoid(),
        type,
        position: clampedPosition,
      };
      setState((prev) => ({
        ...prev,
        supports: [...prev.supports, newSupport],
      }));
    },
    [state.length]
  );

  const updateSupport = useCallback(
    (id: string, updates: Partial<BeamSupport>) => {
      setState((prev) => ({
        ...prev,
        supports: prev.supports.map((s) =>
          s.id === id
            ? {
                ...s,
                ...updates,
                position:
                  updates.position !== undefined
                    ? Math.max(0, Math.min(prev.length, updates.position))
                    : s.position,
              }
            : s
        ),
      }));
    },
    []
  );

  const deleteSupport = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      supports: prev.supports.filter((s) => s.id !== id),
    }));
  }, []);

  // Load management
  const addLoad = useCallback(
    (
      type: BeamLoad["type"],
      magnitude: number,
      positionOrStart: number,
      end?: number
    ) => {
      const newLoad: BeamLoad = {
        id: nanoid(),
        type,
        magnitude,
        direction: "down",
      };

      if (type === "udl") {
        newLoad.start = Math.max(0, Math.min(state.length, positionOrStart));
        newLoad.end = end
          ? Math.max(0, Math.min(state.length, end))
          : Math.min(state.length, positionOrStart + 1);
      } else {
        newLoad.position = Math.max(0, Math.min(state.length, positionOrStart));
      }

      setState((prev) => ({
        ...prev,
        loads: [...prev.loads, newLoad],
      }));
    },
    [state.length]
  );

  const updateLoad = useCallback((id: string, updates: Partial<BeamLoad>) => {
    setState((prev) => ({
      ...prev,
      loads: prev.loads.map((l) => {
        if (l.id !== id) return l;

        const updated = { ...l, ...updates };

        // Clamp positions
        if (updated.position !== undefined) {
          updated.position = Math.max(0, Math.min(prev.length, updated.position));
        }
        if (updated.start !== undefined) {
          updated.start = Math.max(0, Math.min(prev.length, updated.start));
        }
        if (updated.end !== undefined) {
          updated.end = Math.max(0, Math.min(prev.length, updated.end));
        }

        return updated;
      }),
    }));
  }, []);

  const deleteLoad = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      loads: prev.loads.filter((l) => l.id !== id),
    }));
  }, []);

  // Utility: snap position to grid
  const snapPosition = useCallback((position: number): number => {
    return Math.round(position / SNAP_INCREMENT) * SNAP_INCREMENT;
  }, []);

  // Export state for saving
  const getState = useCallback(() => state, [state]);

  // Import state from saved project
  const loadState = useCallback((newState: Partial<BeamEditorState>) => {
    setState((prev) => ({ ...prev, ...newState }));
  }, []);

  return {
    state,
    errors,
    validate,
    setLength,
    setEI,
    addSupport,
    updateSupport,
    deleteSupport,
    addLoad,
    updateLoad,
    deleteLoad,
    snapPosition,
    getState,
    loadState,
  };
}
