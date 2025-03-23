"use client";

import { useState, useEffect } from "react";
import { Blog } from "@/types/blog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Edit,
  Trash2,
  Filter,
  ArrowUpDown,
  Search,
  Plus,
  Eye,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../supabase/client";

interface BlogTableProps {
  initialBlogs: Blog[];
}

export default function BlogTable({ initialBlogs }: BlogTableProps) {
  const [blogs, setBlogs] = useState<Blog[]>(initialBlogs);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof Blog>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Set up realtime subscription
    const channel = supabase
      .channel("blogs-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "blogs",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setBlogs((prev) => [payload.new as Blog, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setBlogs((prev) =>
              prev.map((blog) =>
                blog.id === payload.new.id ? (payload.new as Blog) : blog
              )
            );
          } else if (payload.eventType === "DELETE") {
            setBlogs((prev) =>
              prev.filter((blog) => blog.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Filter blogs based on search term
  const filteredBlogs = blogs.filter(
    (blog) =>
      blog.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blog.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (blog.tags &&
        blog.tags.some((tag) =>
          tag.toLowerCase().includes(searchTerm.toLowerCase())
        ))
  );

  // Sort blogs
  const sortedBlogs = [...filteredBlogs].sort((a, b) => {
    const valueA = a[sortField];
    const valueB = b[sortField];

    // Handle undefined or null values
    if (valueA == null) return 1;
    if (valueB == null) return -1;

    if (sortField === "created_at") {
      return sortDirection === "asc"
        ? new Date(valueA as string).getTime() -
            new Date(valueB as string).getTime()
        : new Date(valueB as string).getTime() -
            new Date(valueA as string).getTime();
    }

    // For non-date values, convert to string for comparison
    const strA = valueA.toString().toLowerCase();
    const strB = valueB.toString().toLowerCase();
    return sortDirection === "asc"
      ? strA.localeCompare(strB)
      : strB.localeCompare(strA);
  });

  const handleSort = (field: keyof Blog) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this blog post?")) {
      setIsDeleting(id);
      try {
        const { error } = await supabase.from("blogs").delete().eq("id", id);

        if (error) {
          console.error("Error deleting blog:", error);
          alert("Failed to delete blog post");
        } else {
          setBlogs(blogs.filter((blog) => blog.id !== id));
        }
      } finally {
        setIsDeleting(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
        <div className="relative w-full sm:w-auto sm:flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search blogs by title, content or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" className="flex items-center gap-2">
            <Filter size={16} />
            <span className="hidden sm:inline">Filter</span>
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowUpDown size={16} />
            <span className="hidden sm:inline">Sort</span>
          </Button>
          <Button asChild className="flex items-center gap-2 ml-auto sm:ml-2">
            <Link href="/dashboard/blogs/new">
              <Plus size={16} />
              <span className="hidden sm:inline">New Post</span>
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="w-[80px]"
                  onClick={() => handleSort("id")}
                >
                  <div className="flex items-center cursor-pointer hover:text-primary transition-colors">
                    ID
                    {sortField === "id" && (
                      <ArrowUpDown size={16} className="ml-1" />
                    )}
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort("created_at")}>
                  <div className="flex items-center cursor-pointer hover:text-primary transition-colors">
                    Created At
                    {sortField === "created_at" && (
                      <ArrowUpDown size={16} className="ml-1" />
                    )}
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort("title")}>
                  <div className="flex items-center cursor-pointer hover:text-primary transition-colors">
                    Title
                    {sortField === "title" && (
                      <ArrowUpDown size={16} className="ml-1" />
                    )}
                  </div>
                </TableHead>
                <TableHead>Content</TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedBlogs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-40 text-center py-8 text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="h-8 w-8 text-muted-foreground/70" />
                      <p>No blog posts found</p>
                      {searchTerm && (
                        <p className="text-sm text-muted-foreground">
                          Try adjusting your search term
                        </p>
                      )}
                      <Button asChild variant="outline" className="mt-2">
                        <Link href="/dashboard/blogs/new">
                          <Plus size={16} className="mr-2" />
                          Create your first post
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedBlogs.map((blog) => (
                  <TableRow
                    key={blog.id}
                    className="group hover:bg-muted/40 transition-colors"
                  >
                    <TableCell>{blog.id}</TableCell>
                    <TableCell suppressHydrationWarning>
                      {new Date(blog.created_at).toLocaleString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="font-medium">{blog.title}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {blog.text}
                    </TableCell>
                    <TableCell>
                      {blog.image ? (
                        <div className="w-12 h-12 rounded-md overflow-hidden bg-muted border">
                          <img
                            src={blog.image}
                            alt={blog.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://via.placeholder.com/100x100?text=Error";
                            }}
                          />
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          No image
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {blog.tags?.map((tag, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="font-normal"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {(!blog.tags || blog.tags.length === 0) && (
                          <span className="text-muted-foreground text-sm">
                            No tags
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          asChild
                          className="h-8 w-8"
                        >
                          <Link href={`/dashboard/blogs/edit/${blog.id}`}>
                            <Eye size={16} className="text-muted-foreground" />
                          </Link>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          asChild
                          className="h-8 w-8"
                        >
                          <Link href={`/dashboard/blogs/edit/${blog.id}`}>
                            <Edit size={16} className="text-blue-500" />
                          </Link>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive/80"
                          onClick={() => handleDelete(blog.id)}
                          disabled={isDeleting === blog.id}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
