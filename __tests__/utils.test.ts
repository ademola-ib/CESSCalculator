import { describe, it, expect } from "vitest";
import { cn, nanoid, formatDate } from "@/lib/utils";

describe("Utils", () => {
  describe("cn", () => {
    it("should merge class names", () => {
      const result = cn("foo", "bar");
      expect(result).toContain("foo");
      expect(result).toContain("bar");
    });

    it("should handle conditional classes", () => {
      const result = cn("base", true && "active", false && "inactive");
      expect(result).toContain("base");
      expect(result).toContain("active");
      expect(result).not.toContain("inactive");
    });
  });

  describe("nanoid", () => {
    it("should generate a string of default length", () => {
      const id = nanoid();
      expect(id).toHaveLength(21);
    });

    it("should generate a string of custom length", () => {
      const id = nanoid(10);
      expect(id).toHaveLength(10);
    });

    it("should generate unique IDs", () => {
      const id1 = nanoid();
      const id2 = nanoid();
      expect(id1).not.toBe(id2);
    });
  });

  describe("formatDate", () => {
    it("should format a timestamp", () => {
      const timestamp = new Date("2024-01-15T10:30:00").getTime();
      const formatted = formatDate(timestamp);
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe("string");
    });
  });
});
