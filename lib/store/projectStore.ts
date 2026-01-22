import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "@/lib/utils";

export interface Project {
  id: string;
  name: string;
  type: "beam" | "frame";
  data: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

interface ProjectStore {
  projects: Project[];
  createProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  duplicateProject: (id: string) => void;
  clearAllProjects: () => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      projects: [],

      createProject: (project) =>
        set((state) => ({
          projects: [project, ...state.projects],
        })),

      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),

      deleteProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
        })),

      renameProject: (id, name) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, name, updatedAt: Date.now() } : p
          ),
        })),

      duplicateProject: (id) =>
        set((state) => {
          const project = state.projects.find((p) => p.id === id);
          if (!project) return state;

          const duplicate: Project = {
            ...project,
            id: nanoid(),
            name: `${project.name} (Copy)`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          return {
            projects: [duplicate, ...state.projects],
          };
        }),

      clearAllProjects: () => set({ projects: [] }),
    }),
    {
      name: "cess-projects",
    }
  )
);
