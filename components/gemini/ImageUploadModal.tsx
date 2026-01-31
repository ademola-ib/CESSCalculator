"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Camera, Upload, X, Loader2, ImageIcon } from "lucide-react";

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExtracted: (data: any) => void;
  problemType?: "beam" | "frame";
}

export function ImageUploadModal({
  isOpen,
  onClose,
  onExtracted,
  problemType,
}: ImageUploadModalProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [additionalContext, setAdditionalContext] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      const validTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
      ];
      if (!validTypes.includes(file.type)) {
        setError("Please select a JPEG, PNG, WebP, or GIF image.");
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError("Image is too large. Maximum size is 10MB.");
        return;
      }

      setSelectedImage(file);
      setError(null);

      // Create preview
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const handleUpload = useCallback(async () => {
    if (!selectedImage) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", selectedImage);
      if (additionalContext) {
        formData.append("context", additionalContext);
      }
      if (problemType) {
        formData.append("context", `This is a ${problemType} problem. ${additionalContext}`);
      }

      const response = await fetch("/api/gemini/parse-structure", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success && result.data) {
        onExtracted(result.data);
      } else if (result.data) {
        // Partial extraction - still send to review
        onExtracted({
          ...result.data,
          _partial: true,
          _error: result.error,
        });
      } else {
        setError(
          result.error || "Failed to extract structure from image. Please try again."
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Network error. Please check your connection."
      );
    } finally {
      setLoading(false);
    }
  }, [selectedImage, additionalContext, problemType, onExtracted]);

  const handleClear = useCallback(() => {
    setSelectedImage(null);
    setPreview(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Solve from Image
              </CardTitle>
              <CardDescription>
                Upload a photo of a structural engineering problem
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Hidden inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Preview area */}
          {preview ? (
            <div className="relative">
              <img
                src={preview}
                alt="Selected problem"
                className="max-h-64 w-full rounded-md border object-contain"
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute right-2 top-2"
                onClick={handleClear}
              >
                <X className="mr-1 h-3 w-3" /> Remove
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-md border-2 border-dashed p-8">
              <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Take a photo or upload an image of your problem
              </p>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Camera
                </Button>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </Button>
              </div>
            </div>
          )}

          {/* Additional context input */}
          <div className="space-y-2">
            <label
              htmlFor="context"
              className="text-sm font-medium text-muted-foreground"
            >
              Additional hints (optional)
            </label>
            <input
              id="context"
              type="text"
              placeholder="e.g., 'This is a 3-span beam with UDL'"
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Error display */}
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              className="flex-1"
              disabled={!selectedImage || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Extract Structure"
              )}
            </Button>
          </div>

          {/* Info text */}
          <p className="text-center text-xs text-muted-foreground">
            AI will extract beam/frame parameters from the image.
            You can review and edit before applying.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
