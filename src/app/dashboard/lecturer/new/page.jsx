"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import DashboardNavbar from "@/components/dashboard-navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Upload, X, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Client-side Supabase initialization
const createClientSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createSupabaseClient(supabaseUrl, supabaseKey);
};

export default function LecturerForm() {
  const router = useRouter();
  const params = useParams();
  const lecturerId = params.id !== "new" ? params.id : null;
  const isEditMode = !!lecturerId;
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [formData, setFormData] = useState({
    fullName: "",
    field: "",
    lecturer_text: "",
    lecturer_image: "",
  });

  // Authentication check
  useEffect(() => {
    try {
      const isAuthenticated = localStorage.getItem("isAuthenticated");
      if (!isAuthenticated) {
        router.replace("/");
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error("localStorage is not available:", err);
      router.replace("/");
    }
  }, [router]);

  // Fetch lecturer data if in edit mode
  useEffect(() => {
    const fetchLecturer = async () => {
      if (isEditMode && !loading) {
        try {
          // Use Supabase client directly instead of API route
          const supabase = createClientSupabase();
          const { data, error: fetchError } = await supabase
            .from("lecturers")
            .select("*")
            .eq("id", lecturerId)
            .single();

          if (fetchError) {
            console.error("Failed to fetch lecturer:", fetchError);
            setError(fetchError.message);
          } else if (data) {
            setFormData({
              fullName: data.fullName || "",
              field: data.field || "",
              lecturer_text: data.lecturer_text || "",
              lecturer_image: data.lecturer_image || "",
            });

            if (data.lecturer_image) {
              setPreviewUrl(data.lecturer_image);
            }
          }
        } catch (err) {
          console.error("Error fetching lecturer:", err);
          setError(err.message);
        }
      }
    };

    fetchLecturer();
  }, [isEditMode, lecturerId, loading]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Update preview if the image URL is entered manually
    if (name === "lecturer_image" && value) {
      setPreviewUrl(value);
    } else if (name === "lecturer_image" && !value) {
      setPreviewUrl(null);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Create local preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    setUploading(true);
    setError(null);

    try {
      const supabase = createClientSupabase();

      // Create a unique file path
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `lecturer_images/${fileName}`;

      // Upload file to Supabase Storage - using the "lecturers" bucket
      const { data, error } = await supabase.storage
        .from("lecturers")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // Get the public URL - use the same "lecturers" bucket name
      const {
        data: { publicUrl },
      } = supabase.storage.from("lecturers").getPublicUrl(filePath);

      // Update form data with the new image URL
      setFormData((prev) => ({
        ...prev,
        lecturer_image: publicUrl,
      }));
    } catch (err) {
      console.error("Error uploading image:", err);
      setError(`Failed to upload image: ${err.message}`);

      // Keep the local preview for better UX even if upload failed
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    setFormData((prev) => ({
      ...prev,
      lecturer_image: "",
    }));

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const supabase = createClientSupabase();
      let response;

      if (isEditMode) {
        // Update existing lecturer
        response = await supabase
          .from("lecturers")
          .update({
            fullName: formData.fullName,
            field: formData.field,
            lecturer_text: formData.lecturer_text,
            lecturer_image: formData.lecturer_image,
            updated_at: new Date().toISOString(),
          })
          .eq("id", lecturerId);
      } else {
        // Insert new lecturer
        response = await supabase.from("lecturers").insert({
          fullName: formData.fullName,
          field: formData.field,
          lecturer_text: formData.lecturer_text,
          lecturer_image: formData.lecturer_image,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Success, redirect to lecturers page
      router.push("/dashboard/lecturer");
    } catch (err) {
      console.error("Error saving lecturer:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-xl">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <DashboardNavbar />
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="mb-6">
          <Link href="/dashboard/lecturer">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Lecturers
            </Button>
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            {isEditMode ? "Edit Lecturer" : "Add New Lecturer"}
          </h1>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>Error: {error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6">
            <div className="grid gap-3">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="Enter lecturer's full name"
                required
              />
            </div>

            <div className="grid gap-3">
              <Label htmlFor="field">Field of Expertise</Label>
              <Input
                id="field"
                name="field"
                value={formData.field}
                onChange={handleInputChange}
                placeholder="E.g., Computer Science, Mathematics, Physics"
              />
            </div>

            <div className="grid gap-3">
              <Label>Profile Image</Label>

              <div className="flex flex-col space-y-4">
                {/* Image Preview Area */}
                {previewUrl ? (
                  <div className="relative rounded-lg border border-gray-200 bg-gray-50 p-2">
                    <div className="group relative h-64 w-full overflow-hidden rounded-md">
                      <img
                        src={previewUrl}
                        alt="Lecturer profile"
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          setError(
                            "Failed to load image. Please check the URL."
                          );
                          e.currentTarget.src = "/placeholder-image.jpg";
                        }}
                      />

                      {/* Overlay with actions */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={handleRemoveImage}
                          className="rounded-full p-2"
                        >
                          <X className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-sm text-gray-600 truncate max-w-xs">
                        {formData.lecturer_image || "Uploaded image"}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={triggerFileInput}
                      >
                        Replace
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12 text-center hover:bg-gray-50 cursor-pointer"
                    onClick={triggerFileInput}
                  >
                    <div className="mb-4 rounded-full bg-gray-100 p-4">
                      <ImageIcon className="h-8 w-8 text-gray-500" />
                    </div>
                    <p className="mb-2 text-sm font-semibold text-gray-700">
                      Click to upload an image
                    </p>
                    <p className="text-xs text-gray-500">
                      SVG, PNG, JPG or GIF (Max. 2MB)
                    </p>
                  </div>
                )}

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                />

                {/* Manual URL input option */}
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center">
                    <div className="flex-grow h-px bg-gray-200"></div>
                    <span className="px-2 text-sm text-gray-500">
                      Or enter image URL
                    </span>
                    <div className="flex-grow h-px bg-gray-200"></div>
                  </div>

                  <Input
                    id="lecturer_image"
                    name="lecturer_image"
                    value={formData.lecturer_image}
                    onChange={handleInputChange}
                    placeholder="Enter image URL"
                  />
                </div>
              </div>

              {uploading && (
                <div className="text-sm text-blue-600 flex items-center">
                  <div className="h-4 w-4 mr-2 animate-spin">⏳</div>
                  Uploading image...
                </div>
              )}
            </div>

            <div className="grid gap-3">
              <Label htmlFor="lecturer_text">Biography</Label>
              <Textarea
                id="lecturer_text"
                name="lecturer_text"
                value={formData.lecturer_text}
                onChange={handleInputChange}
                placeholder="Enter lecturer's biography or description"
                rows={6}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              className="gap-2"
              disabled={saving || uploading}
            >
              {saving ? (
                <>
                  <span className="h-4 w-4 animate-spin">⏳</span>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Lecturer
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
