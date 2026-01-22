"use client";

import { useState, useCallback, useEffect } from "react";
import { nanoid } from "@/lib/utils";
import { FrameEditorState, FrameNode, FrameMember, FrameLoad } from "@/lib/types/frameEditor";

export function useFrameEditor(initialState?: Partial<FrameEditorState>) {
  const [state, setState] = useState<FrameEditorState>({
    bays: initialState?.bays || 2,
    stories: initialState?.stories || 2,
    bayWidth: initialState?.bayWidth || 6,
    storyHeight: initialState?.storyHeight || 4,
    columnEI: initialState?.columnEI || 80000,
    beamEI: initialState?.beamEI || 60000,
    nodes: initialState?.nodes || [],
    members: initialState?.members || [],
    loads: initialState?.loads || [],
  });

  // Auto-generate nodes and members when geometry changes
  useEffect(() => {
    generateFrame();
  }, [state.bays, state.stories, state.bayWidth, state.storyHeight]);

  const generateFrame = useCallback(() => {
    const nodes: FrameNode[] = [];
    const members: FrameMember[] = [];

    // Generate nodes
    for (let story = 0; story <= state.stories; story++) {
      for (let bay = 0; bay <= state.bays; bay++) {
        const node: FrameNode = {
          id: `n-${bay}-${story}`,
          x: bay,
          y: story,
        };

        // Add support at base
        if (story === 0) {
          node.support = bay === 0 ? "fixed" : "pinned";
        }

        nodes.push(node);
      }
    }

    // Generate members
    for (let story = 0; story <= state.stories; story++) {
      for (let bay = 0; bay <= state.bays; bay++) {
        const nodeId = `n-${bay}-${story}`;

        // Horizontal beams
        if (bay < state.bays && story > 0) {
          members.push({
            id: `beam-${bay}-${story}`,
            nodeA: nodeId,
            nodeB: `n-${bay + 1}-${story}`,
            type: "beam",
            ei: state.beamEI,
          });
        }

        // Vertical columns
        if (story < state.stories) {
          members.push({
            id: `col-${bay}-${story}`,
            nodeA: nodeId,
            nodeB: `n-${bay}-${story + 1}`,
            type: "column",
            ei: state.columnEI,
          });
        }
      }
    }

    setState((prev) => ({ ...prev, nodes, members }));
  }, [state.bays, state.stories, state.bayWidth, state.storyHeight, state.beamEI, state.columnEI]);

  const setGeometry = useCallback((
    bays: number,
    stories: number,
    bayWidth: number,
    storyHeight: number
  ) => {
    setState((prev) => ({ ...prev, bays, stories, bayWidth, storyHeight }));
  }, []);

  const setColumnEI = useCallback((ei: number) => {
    setState((prev) => ({ ...prev, columnEI: ei }));
  }, []);

  const setBeamEI = useCallback((ei: number) => {
    setState((prev) => ({ ...prev, beamEI: ei }));
  }, []);

  const addJointLoad = useCallback((nodeId: string, type: FrameLoad["type"], magnitude: number) => {
    const newLoad: FrameLoad = {
      id: nanoid(),
      type,
      nodeId,
      magnitude,
    } as any;

    setState((prev) => ({
      ...prev,
      loads: [...prev.loads, newLoad],
    }));
  }, []);

  const deleteLoad = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      loads: prev.loads.filter((l) => l.id !== id),
    }));
  }, []);

  const getState = useCallback(() => state, [state]);

  return {
    state,
    setGeometry,
    setColumnEI,
    setBeamEI,
    addJointLoad,
    deleteLoad,
    getState,
  };
}
