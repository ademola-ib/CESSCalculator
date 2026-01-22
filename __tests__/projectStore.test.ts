import { describe, it, expect, beforeEach } from "vitest";
import { useProjectStore } from "@/lib/store/projectStore";

describe("ProjectStore", () => {
  beforeEach(() => {
    // Reset store before each test
    useProjectStore.setState({ projects: [] });
  });

  it("should create a new project", () => {
    const { createProject } = useProjectStore.getState();

    createProject({
      id: "test-1",
      name: "Test Project",
      type: "beam",
      data: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const { projects } = useProjectStore.getState();
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe("Test Project");
  });

  it("should update a project", () => {
    const { createProject, updateProject } = useProjectStore.getState();

    createProject({
      id: "test-1",
      name: "Original Name",
      type: "beam",
      data: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    updateProject("test-1", { name: "Updated Name" });

    const { projects } = useProjectStore.getState();
    expect(projects[0].name).toBe("Updated Name");
  });

  it("should delete a project", () => {
    const { createProject, deleteProject } = useProjectStore.getState();

    createProject({
      id: "test-1",
      name: "To Delete",
      type: "beam",
      data: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    deleteProject("test-1");

    const { projects } = useProjectStore.getState();
    expect(projects).toHaveLength(0);
  });

  it("should duplicate a project", () => {
    const { createProject, duplicateProject } = useProjectStore.getState();

    createProject({
      id: "test-1",
      name: "Original",
      type: "beam",
      data: { someKey: "value" },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    duplicateProject("test-1");

    const { projects } = useProjectStore.getState();
    expect(projects).toHaveLength(2);
    expect(projects[0].name).toContain("Copy");
    expect(projects[0].data).toEqual(projects[1].data);
  });
});
