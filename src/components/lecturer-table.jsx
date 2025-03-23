"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, AlertCircle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../supabase/server";

export default function LecturerTable({ lecturers: initialLecturers }) {
  const router = useRouter();
  const [lecturers, setLecturers] = useState(initialLecturers);
  const [deleting, setDeleting] = useState(null);
  const [notification, setNotification] = useState(null);
  const [supabase, setSupabase] = useState(null);

  // Initialize Supabase client
  useEffect(() => {
    const initSupabase = async () => {
      const client = await createClient();
      setSupabase(client);
    };

    initSupabase();
  }, []);

  // Set up realtime subscription for admin synchronization
  useEffect(() => {
    if (!supabase) return;

    const subscription = supabase
      .channel("public:lecturers")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lecturers",
        },
        (payload) => {
          console.log("Change received!", payload);

          if (payload.eventType === "DELETE") {
            // Remove the deleted lecturer from the state
            setLecturers((prev) => prev.filter((l) => l.id !== payload.old.id));

            // Show notification if deleted by someone else
            if (deleting !== payload.old.id) {
              showNotification({
                type: "info",
                message: `Lecturer was deleted by another admin`,
              });
            }
          } else if (payload.eventType === "INSERT") {
            // Add new lecturer to the state
            setLecturers((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            // Update the lecturer in the state
            setLecturers((prev) =>
              prev.map((l) => (l.id === payload.new.id ? payload.new : l))
            );
          }
        }
      )
      .subscribe();

    // Cleanup subscription on component unmount
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [supabase, deleting]);

  const showNotification = ({ type, message }) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDelete = async (id, name) => {
    if (confirm("Are you sure you want to delete this lecturer?")) {
      setDeleting(id);

      // Optimistic UI update
      const deletedLecturer = lecturers.find((l) => l.id === id);
      setLecturers((prev) => prev.filter((l) => l.id !== id));

      try {
        const supabase = await createClient();
        const { error } = await supabase
          .from("lecturers")
          .delete()
          .eq("id", id);

        if (error) {
          console.error("Error deleting lecturer:", error);

          // Rollback UI state on error
          setLecturers((prev) =>
            [...prev, deletedLecturer].sort(
              (a, b) => new Date(b.created_at) - new Date(a.created_at)
            )
          );

          showNotification({
            type: "error",
            message: "Failed to delete lecturer. Please try again.",
          });
        } else {
          showNotification({
            type: "success",
            message: `Lecturer successfully deleted`,
          });
        }
      } catch (err) {
        console.error("Error during delete operation:", err);

        // Rollback UI state on error
        setLecturers((prev) =>
          [...prev, deletedLecturer].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
          )
        );

        showNotification({
          type: "error",
          message: "An error occurred. Please try again.",
        });
      } finally {
        setDeleting(null);
      }
    }
  };

  if (lecturers.length === 0) {
    return (
      <div className="mt-10 text-center">
        <p className="text-lg text-gray-500">
          No lecturers found. Add your first lecturer!
        </p>
      </div>
    );
  }

  return (
    <>
      {notification && (
        <div
          className={`mb-4 p-3 rounded-md flex items-center ${
            notification.type === "error"
              ? "bg-red-100 text-red-800 border border-red-300"
              : notification.type === "success"
                ? "bg-green-100 text-green-800 border border-green-300"
                : "bg-blue-100 text-blue-800 border border-blue-300"
          }`}
        >
          {notification.type === "error" ? (
            <AlertCircle className="h-5 w-5 mr-2" />
          ) : (
            <CheckCircle className="h-5 w-5 mr-2" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Field</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lecturers.map((lecturer) => (
              <TableRow key={lecturer.id}>
                <TableCell>
                  {lecturer.lecturer_image ? (
                    <div className="relative mt-24 h-12 w-12 overflow-hidden rounded-md">
                      <img
                        src={lecturer.lecturer_image}
                        alt={lecturer.fullName || "Lecturer"}
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded-md bg-gray-200"></div>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  {lecturer.fullName || "Unnamed"}
                </TableCell>
                <TableCell>{lecturer.field || "N/A"}</TableCell>
                <TableCell>
                  {lecturer.created_at
                    ? new Date(lecturer.created_at).toLocaleDateString()
                    : "N/A"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Link href={`/dashboard/lecturer/new/${lecturer.id}`}>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        handleDelete(lecturer.id, lecturer.fullName)
                      }
                      disabled={deleting === lecturer.id}
                    >
                      {deleting === lecturer.id ? (
                        <span className="h-4 w-4 animate-spin">⏳</span>
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
