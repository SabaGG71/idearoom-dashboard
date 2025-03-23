"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardNavbar from "@/components/dashboard-navbar";
import LecturerTable from "@/components/lecturer-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { toast } from "@/components/ui/use-toast";

// Client-side Supabase initialization
const createClientSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createSupabaseClient(supabaseUrl, supabaseKey);
};

export default function LecturersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [lecturers, setLecturers] = useState([]);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [deleteMessage, setDeleteMessage] = useState(null);
  const [supabase, setSupabase] = useState(null);

  // Authentication check - ensures redirect happens immediately
  useEffect(() => {
    try {
      const isAuthenticated = localStorage.getItem("isAuthenticated");
      if (!isAuthenticated) {
        // Immediate redirect if not authenticated
        router.replace("/");
        return; // Exit early to prevent further code execution
      } else {
        setLoading(false);
        // Initialize Supabase client
        setSupabase(createClientSupabase());
      }
    } catch (err) {
      console.error("localStorage is not available:", err);
      router.replace("/");
    }
  }, [router]);

  // Data fetching from Supabase - only runs if authenticated
  useEffect(() => {
    const fetchData = async () => {
      if (!supabase) return;

      try {
        console.log("Fetching lecturers data...");

        const { data: fetchedLecturers, error: supabaseError } = await supabase
          .from("lecturers")
          .select("*")
          .order("created_at", { ascending: false });

        console.log("Fetched data:", fetchedLecturers);

        if (supabaseError) {
          console.error("Error fetching lecturers:", supabaseError);
          setError(supabaseError.message);
          setLecturers([]);
        } else {
          setLecturers(fetchedLecturers || []);
          setError(null);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message);
        setLecturers([]);
      }
    };

    if (!loading && supabase) {
      fetchData();
    }
  }, [loading, supabase]);

  // Set up realtime subscription for admin synchronization
  useEffect(() => {
    if (!supabase) return;

    // Subscribe to changes on the lecturers table
    const subscription = supabase
      .channel("lecturers-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lecturers",
        },
        (payload) => {
          console.log("Change received!", payload);

          // Handle different types of changes
          if (payload.eventType === "DELETE") {
            // Remove the deleted lecturer from the state
            setLecturers((prev) => prev.filter((l) => l.id !== payload.old.id));
            setDeleteMessage(
              `Lecturer "${payload.old.name}" was deleted by an admin`
            );
            setTimeout(() => setDeleteMessage(null), 3000);
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
  }, [supabase]);

  const handleLogout = () => {
    try {
      localStorage.removeItem("isAuthenticated");
      router.push("/");
    } catch (err) {
      console.error("localStorage is not available:", err);
    }
  };

  // Function to handle lecturer deletion
  const handleDeleteLecturer = async (id, name) => {
    try {
      if (!supabase) return;

      // Optimistic UI update (remove from UI immediately)
      setLecturers((prev) => prev.filter((lecturer) => lecturer.id !== id));
      setDeleteMessage(`Deleting lecturer "${name}"...`);

      const { error: deleteError } = await supabase
        .from("lecturers")
        .delete()
        .eq("id", id);

      if (deleteError) {
        console.error("Error deleting lecturer:", deleteError);

        // Rollback UI if there was an error
        const { data } = await supabase
          .from("lecturers")
          .select("*")
          .order("created_at", { ascending: false });

        setLecturers(data || []);

        setError(deleteError.message);
        setDeleteMessage(null);

        toast({
          title: "Error",
          description: `Failed to delete lecturer: ${deleteError.message}`,
          variant: "destructive",
        });
      } else {
        // Success notification
        setDeleteMessage(`Lecturer "${name}" was successfully deleted`);

        // Clear the message after 3 seconds
        setTimeout(() => {
          setDeleteMessage(null);
        }, 3000);

        toast({
          title: "Success",
          description: `Lecturer "${name}" successfully deleted`,
          variant: "default",
        });
      }
    } catch (err) {
      console.error("Error in delete operation:", err);
      setError(err.message);
    }
  };

  // If not authenticated, show minimal loading state while redirect happens
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  return (
    <>
      <DashboardNavbar onLogout={handleLogout} />
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Lecturer Management</h1>
          <Link href="/dashboard/lecturer/new">
            <Button className="flex items-center gap-2">
              <PlusCircle size={16} />
              New Lecturer
            </Button>
          </Link>
        </div>

        {deleteMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 relative">
            <span className="block sm:inline">{deleteMessage}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Error: {error}</p>
            <p className="text-sm">
              Check your Supabase configuration and connection.
            </p>
          </div>
        )}

        {lecturers.length > 0 ? (
          <LecturerTable
            lecturers={lecturers}
            onDelete={handleDeleteLecturer}
          />
        ) : (
          <div className="text-center p-8 bg-gray-50 rounded-lg">
            No lecturers found. Add your first lecturer!
          </div>
        )}
      </div>
    </>
  );
}
