import { requireAdminPageAccess } from "@/lib/auth/guards";
import { canWriteSection } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminCategoriesPage() {
  const profile = await requireAdminPageAccess("categories");
  const canEdit = canWriteSection(profile.role, "categories");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground">
            Organize specialty grocery departments, slugs, display order, and visibility.
          </p>
        </div>
        <Badge variant={canEdit ? "default" : "secondary"}>
          {canEdit ? "Full Edit Access" : "View Only (Staff)"}
        </Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Category Manager (Milestone M1 — Day 2)</CardTitle>
          <CardDescription>
            Create, edit, reorder, and safely delete empty categories on Day 2.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No categories yet.
        </CardContent>
      </Card>
    </div>
  );
}