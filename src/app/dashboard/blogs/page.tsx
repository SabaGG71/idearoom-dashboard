"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardNavbar from "@/components/dashboard-navbar";
import BlogTable from "@/components/blog-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { createClient } from "../../../../supabase/server";
import { Blog } from "@/types/blog"; // Import the Blog type from your types directory

export default function BlogsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [user, setUser] = useState<any>(null);

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

  // Data fetching from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = await createClient();
        const { data: fetchedBlogs, error } = await supabase
          .from("blogs")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching blogs:", error);
          setBlogs([]); // Set empty array on error
        } else {
          setBlogs(fetchedBlogs || []);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setBlogs([]);
      }
    };

    if (!loading) {
      fetchData();
    }
  }, [loading]);

  const handleLogout = () => {
    try {
      localStorage.removeItem("isAuthenticated");
      router.push("/");
    } catch (err) {
      console.error("localStorage is not available:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <>
      <DashboardNavbar handleLogOut={handleLogout} />
      <main className="w-full">
        <div className="container mx-auto px-4 py-8 flex flex-col gap-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Blog Management</h1>
            <Link href="/dashboard/blogs/new">
              <Button className="flex items-center gap-2">
                <PlusCircle size={16} />
                New Blog Post
              </Button>
            </Link>
          </div>
          <BlogTable initialBlogs={blogs} />
        </div>
      </main>
    </>
  );
}
