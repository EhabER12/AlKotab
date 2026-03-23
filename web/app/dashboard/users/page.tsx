"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import RoleBasedGuard from "@/components/auth/RoleBasedGuard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Loader2,
  Trash2,
  Edit,
  UserCheck,
  UserCog,
  ShieldCheck,
  AlertCircle,
  UserPlus,
  Users,
  Mail,
  CheckCircle,
  XCircle,
  Key,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  getAllUsers,
  createUser,
  updateUserRole,
  deleteUser,
  updateUser,
  approveTeacher,
  rejectTeacher,
  updateUserPassword,
} from "@/store/services/userService";
import { resetUserManagementStatus } from "@/store/slices/userSlice";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAdminLocale } from "@/hooks/dashboard/useAdminLocale";
import {
  MODERATOR_DASHBOARD_ACCESS_GROUPS,
  MODERATOR_DASHBOARD_ACCESS_OPTIONS,
  getResolvedModeratorDashboardAccess,
} from "@/lib/dashboardAccess";

// Define roles - adjust based on your actual roles
const ROLES = ["user", "teacher", "moderator", "admin"];

const dashboardAccessOptionMap = new Map(
  MODERATOR_DASHBOARD_ACCESS_OPTIONS.map((item) => [item.href, item])
);

export default function UsersDashboardPage() {
  return (
    <RoleBasedGuard allowedRoles={["admin"]} fallbackUrl="/dashboard">
      <UsersContent />
    </RoleBasedGuard>
  );
}

function UsersContent() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { t, isRtl } = useAdminLocale();
  const {
    users,
    isLoading,
    isError,
    isSuccess,
    message,
    totalPages,
    currentPage,
    totalUsers,
  } = useAppSelector((state) => state.userManagement);

  const [page, setPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectingTeacherId, setRejectingTeacherId] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  // Password Update State
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordUserId, setPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  // State for creating new user (Invite)
  const [newUser, setNewUser] = useState({
    email: "",
    role: "user",
  });

  // State for editing user
  const [editingUser, setEditingUser] = useState({
    userId: "",
    name: "",
    email: "",
    role: "user",
    status: "active",
    employeeInfo: {
      dashboardAccess: getResolvedModeratorDashboardAccess(),
    },
  });

  const fetchUsers = useCallback(
    (pageNum = 1) => {
      setPage(pageNum);
      dispatch(getAllUsers());
    },
    [dispatch]
  );

  useEffect(() => {
    fetchUsers(page);

    return () => {
      dispatch(resetUserManagementStatus());
    };
  }, [dispatch, fetchUsers, page]);

  useEffect(() => {
    if (currentPage && currentPage !== page) {
      setPage(currentPage);
    }
  }, [currentPage]);

  const handlePageChange = (pageNum: number) => {
    if (pageNum > 0 && pageNum <= totalPages) {
      fetchUsers(pageNum);
    }
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    if (
      userId &&
      confirm(`Are you sure you want to change this user's role to ${newRole}?`)
    ) {
      dispatch(updateUserRole({ userId, role: newRole }));
    }
  };

  const handleDelete = (userId: string) => {
    if (
      userId &&
      confirm(
        "Are you sure you want to delete this user? This cannot be undone."
      )
    ) {
      dispatch(deleteUser(userId));
    }
  };

  const handleCreateUser = () => {
    if (!newUser.email) {
      alert("Please fill in all required fields");
      return;
    }
    // Dispatch create user with only email and role (Invite flow)
    dispatch(createUser(newUser));
    setIsCreateDialogOpen(false);
    setNewUser({ email: "", role: "user" });
  };

  const openEditDialog = (user: any) => {
    // Helper to safely get name
    let userName = "";
    if (user.name) {
      userName = user.name;
    } else if (user.fullName) {
      if (typeof user.fullName === 'string') {
        userName = user.fullName;
      } else {
        userName = isRtl ? (user.fullName.ar || user.fullName.en || "") : (user.fullName.en || user.fullName.ar || "");
      }
    }

    setEditingUser({
      userId: user.id || user._id || "",
      name: userName,
      email: user.email || "",
      role: user.role || "user",
      status: user.status || "active",
      employeeInfo: {
        dashboardAccess: getResolvedModeratorDashboardAccess(
          user.employeeInfo?.dashboardAccess
        ),
      },
    });
    setIsEditDialogOpen(true);
  };

  const selectedDashboardAccess = getResolvedModeratorDashboardAccess(
    editingUser.employeeInfo?.dashboardAccess
  );

  const getDashboardAccessTitle = (href: string) => {
    const option = dashboardAccessOptionMap.get(href);
    if (!option) return href;

    const translated = t(option.titleKey);
    return translated !== option.titleKey ? translated : option.fallbackTitle;
  };

  const handleEditRoleChange = (value: string) => {
    setEditingUser((prev) => ({
      ...prev,
      role: value,
      employeeInfo: {
        ...prev.employeeInfo,
        dashboardAccess: getResolvedModeratorDashboardAccess(
          prev.employeeInfo?.dashboardAccess
        ),
      },
    }));
  };

  const handleToggleDashboardAccess = (href: string, enabled: boolean) => {
    setEditingUser((prev) => {
      const currentAccess = getResolvedModeratorDashboardAccess(
        prev.employeeInfo?.dashboardAccess
      );

      if (!enabled && currentAccess.length === 1 && currentAccess.includes(href)) {
        return prev;
      }

      const nextAccess = enabled
        ? [...new Set([...currentAccess, href])]
        : currentAccess.filter((item) => item !== href);

      return {
        ...prev,
        employeeInfo: {
          ...prev.employeeInfo,
          dashboardAccess: nextAccess,
        },
      };
    });
  };

  const handleUpdateUser = async () => {
    if (!editingUser.userId || !editingUser.email) {
      alert("Please fill in all required fields");
      return;
    }

    // Get the original user to check if role changed
    const originalUser = users.find((u) => (u.id || u._id) === editingUser.userId);

    // Update basic user info
    const updatePayload = {
      userId: editingUser.userId,
      name: editingUser.name,
      email: editingUser.email,
      role: editingUser.role,
      status: editingUser.status,
      ...(editingUser.role === "moderator"
        ? {
            employeeInfo: {
              dashboardAccess: selectedDashboardAccess,
            },
          }
        : {}),
    };

    await dispatch(updateUser(updatePayload));

    // If role changed, call the separate role update endpoint
    if (originalUser && originalUser.role !== editingUser.role) {
      await dispatch(
        updateUserRole({ userId: editingUser.userId, role: editingUser.role })
      );
    }

    setIsEditDialogOpen(false);
  };

  const handleApproveTeacher = (userId: string) => {
    if (
      userId &&
      confirm("Are you sure you want to approve this teacher? They will be able to access the dashboard.")
    ) {
      dispatch(approveTeacher(userId));
    }
  };

  const openRejectDialog = (userId: string) => {
    setRejectingTeacherId(userId);
    setRejectionReason("");
    setIsRejectDialogOpen(true);
  };

  const handleRejectTeacher = () => {
    if (rejectingTeacherId) {
      dispatch(
        rejectTeacher({
          userId: rejectingTeacherId,
          reason: rejectionReason,
          sendEmail: true,
        })
      );
      setIsRejectDialogOpen(false);
      setRejectingTeacherId("");
      setRejectionReason("");
    }
  };

  const retryFetch = () => {
    fetchUsers(page);
  };

  const getRoleIcon = (role: string | undefined) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return <ShieldCheck className="mr-1 h-3 w-3" />;
      case "moderator":
        return <UserCog className="mr-1 h-3 w-3" />;
      case "teacher":
        return <Users className="mr-1 h-3 w-3" />;
      case "user":
      default:
        return <UserCheck className="mr-1 h-3 w-3" />;
    }
  };

  // Render Loading State
  if (isLoading && users.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const openPasswordDialog = (userId: string) => {
    setPasswordUserId(userId);
    setNewPassword("");
    setIsPasswordDialogOpen(true);
  };

  const handleUpdatePassword = async () => {
    if (!passwordUserId || !newPassword) return;
    if (newPassword.length < 6) return;

    await dispatch(updateUserPassword({ userId: passwordUserId, password: newPassword }));
    setIsPasswordDialogOpen(false);
  };

  const safeRender = (value: any, fallback = "N/A") => {
    if (!value) return fallback;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'object') {
      return value.en || value.ar || fallback;
    }
    return fallback;
  };

  // Safe Rendering Component
  const SafeBadge = ({ value, variant = "outline", className = "" }: any) => {
    const text = safeRender(value, "");
    if (!text) return null;
    return (
      <Badge variant={variant} className={className}>
        {text}
      </Badge>
    );
  };

  return (
    <div className="p-6" dir={isRtl ? "rtl" : "ltr"}>
      <div className={`mb-6 flex items-center justify-between`}>
        <div>
          <h1 className="text-2xl font-bold">{t("admin.users.manageUsers")}</h1>
          <div className="text-sm text-gray-500">
            {t("admin.users.totalUsers").replace("{count}", String(totalUsers))}
          </div>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
              {t("admin.users.inviteUser")}
            </Button>
          </DialogTrigger>
          <DialogContent
            className="sm:max-w-[425px]"
            dir={isRtl ? "rtl" : "ltr"}
          >
            <DialogHeader className={`sm:text-start`}>
              <DialogTitle>{t("admin.users.inviteNewUser")}</DialogTitle>
              <DialogDescription>
                {t("admin.users.inviteDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email">{t("admin.users.email")} *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  placeholder="john@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">{t("admin.users.role")}</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value) =>
                    setNewUser({ ...newUser, role: value })
                  }
                >
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">
                      {t("admin.users.user")}
                    </SelectItem>
                    <SelectItem value="teacher">
                      {t("admin.users.teacher")}
                    </SelectItem>
                    <SelectItem value="moderator">
                      {t("admin.users.moderator")}
                    </SelectItem>
                    <SelectItem value="admin">
                      {t("admin.users.admin")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2 justify-start">
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                {t("admin.common.cancel")}
              </Button>
              <Button onClick={handleCreateUser} disabled={isLoading}>
                {isLoading && <Loader2 className="mx-2 h-4 w-4 animate-spin" />}
                {t("admin.users.sendInvitation")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog - Using safeRender logic for initialization */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent
            className="max-h-[85vh] overflow-y-auto sm:max-w-3xl"
            dir={isRtl ? "rtl" : "ltr"}
          >
            <DialogHeader>
              <DialogTitle className="text-start">
                {t("admin.users.editUser")}
              </DialogTitle>
              <DialogDescription className="text-start">
                {t("admin.users.updateUserDetails")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">{t("admin.users.name")}</Label>
                <Input
                  id="edit-name"
                  value={editingUser.name}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, name: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-email">{t("admin.users.email")} *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingUser.email}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, email: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-role">{t("admin.users.role")}</Label>
                <Select
                  value={editingUser.role}
                  onValueChange={handleEditRoleChange}
                  dir={isRtl ? "rtl" : "ltr"}
                >
                  <SelectTrigger id="edit-role" dir={isRtl ? "rtl" : "ltr"}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir={isRtl ? "rtl" : "ltr"}>
                    <SelectItem value="user">
                      {t("admin.users.user")}
                    </SelectItem>
                    <SelectItem value="teacher">
                      {t("admin.users.teacher")}
                    </SelectItem>
                    <SelectItem value="moderator">
                      {t("admin.users.moderator")}
                    </SelectItem>
                    <SelectItem value="admin">
                      {t("admin.users.admin")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-status">{t("admin.users.status")}</Label>
                <Select
                  value={editingUser.status}
                  onValueChange={(value) =>
                    setEditingUser({ ...editingUser, status: value })
                  }
                  dir={isRtl ? "rtl" : "ltr"}
                >
                  <SelectTrigger id="edit-status" dir={isRtl ? "rtl" : "ltr"}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir={isRtl ? "rtl" : "ltr"}>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="invited">Invited</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editingUser.role === "moderator" && (
                <div className="space-y-4 rounded-lg border p-4">
                  <div className="space-y-1 text-start">
                    <h3 className="font-medium">
                      {isRtl
                        ? "صلاحيات صفحات الداشبورد"
                        : "Dashboard Page Access"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {isRtl
                        ? "حدد الصفحات التي تظهر لهذا المودريتور داخل لوحة التحكم."
                        : "Choose which dashboard pages should be visible to this moderator."}
                    </p>
                  </div>

                  <div className="rounded-lg border bg-muted/40 p-3">
                    <p className="text-sm font-medium">
                      {isRtl
                        ? "الصفحات المفعلة حاليًا"
                        : "Currently enabled pages"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedDashboardAccess.map((href) => (
                        <Badge key={href} variant="secondary">
                          {getDashboardAccessTitle(href)}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {MODERATOR_DASHBOARD_ACCESS_GROUPS.map((group) => (
                      <div
                        key={group.id}
                        className="rounded-lg border border-dashed p-3"
                      >
                        <p className="mb-3 font-medium">
                          {isRtl ? group.label.ar : group.label.en}
                        </p>

                        <div className="space-y-3">
                          {group.items.map((item) => {
                            const isChecked = selectedDashboardAccess.includes(
                              item.href
                            );
                            const isLastSelected =
                              isChecked && selectedDashboardAccess.length === 1;

                            return (
                              <label
                                key={item.href}
                                className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:border-primary/40"
                              >
                                <Checkbox
                                  checked={isChecked}
                                  disabled={isLastSelected}
                                  onCheckedChange={(checked) =>
                                    handleToggleDashboardAccess(
                                      item.href,
                                      checked === true
                                    )
                                  }
                                />
                                <div className="space-y-1">
                                  <p className="font-medium leading-none">
                                    {getDashboardAccessTitle(item.href)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.href}
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {isRtl
                      ? "يجب ترك صفحة واحدة على الأقل مفعلة لهذا المودريتور."
                      : "Keep at least one dashboard page enabled for this moderator."}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2 justify-start">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                {t("admin.common.cancel")}
              </Button>
              <Button onClick={handleUpdateUser} disabled={isLoading}>
                {isLoading && <Loader2 className="mx-2 h-4 w-4 animate-spin" />}
                {t("admin.users.update")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Teacher Dialog */}
        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.teachers.rejectTeacher")}</DialogTitle>
              <DialogDescription>
                {t("admin.teachers.rejectConfirm")}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="reject-reason">{t("admin.teachers.rejectionReason")}</Label>
              <Input
                id="reject-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t("admin.teachers.reasonPlaceholder")}
                className="mt-2"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
                {t("admin.common.cancel")}
              </Button>
              <Button variant="destructive" onClick={handleRejectTeacher}>
                {t("admin.common.confirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change Password Dialog */}
        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{t("admin.users.changePassword") || "Change Password"}</DialogTitle>
              <DialogDescription>
                {t("admin.users.changePasswordDesc") || "Enter the new password for this user."}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="new-password">{t("admin.users.password") || "Password"}</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="******"
                className="mt-2"
              />
              {newPassword.length > 0 && newPassword.length < 6 && (
                <p className="text-destructive text-xs mt-1">Password must be at least 6 characters</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
                {t("admin.common.cancel")}
              </Button>
              <Button onClick={handleUpdatePassword} disabled={isLoading || newPassword.length < 6}>
                {isLoading && <Loader2 className="mx-2 h-4 w-4 animate-spin" />}
                {t("admin.common.confirm") || "Update"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>

      {isError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{safeRender(message, "Error")}</AlertDescription>
        </Alert>
      )}

      {isSuccess && message && (
        <Alert className="mb-6 bg-green-50 text-green-800 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{safeRender(message, "Success")}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("admin.users.name")}</TableHead>
              <TableHead>{t("admin.users.email")}</TableHead>
              <TableHead>{t("admin.users.role")}</TableHead>
              <TableHead>{t("admin.users.status")}</TableHead>
              <TableHead className="text-end">{t("admin.users.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("admin.users.noUsers")}
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id || user._id}>
                  <TableCell className="font-medium">
                    {safeRender(user.name) || safeRender(user.fullName, "N/A")}
                  </TableCell>
                  <TableCell>
                    {safeRender(user.email)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <div className="flex gap-1 items-center border rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground">
                        {getRoleIcon(safeRender(user.role, "user"))}
                        {safeRender(user.role, "user")}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${user.status === "active"
                      ? "border-transparent bg-green-600 text-white hover:bg-green-700"
                      : user.status === "invited"
                        ? "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        : "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80"
                      }`}>
                      {safeRender(user.status, "active")}
                    </div>
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex justify-end gap-2">
                      {user.role === "teacher" && !user.teacherInfo?.isApproved && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleApproveTeacher(user.id || user._id || "")}
                          title={t("admin.teachers.approve")}
                        >
                          <ShieldCheck className="h-4 w-4" />
                          <span className="sr-only">Approve</span>
                        </Button>
                      )}

                      {user.role === "teacher" && !user.teacherInfo?.isApproved && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => openRejectDialog(user.id || user._id || "")}
                          title={t("admin.teachers.reject")}
                        >
                          <XCircle className="h-4 w-4" />
                          <span className="sr-only">Reject</span>
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(user)}
                      >
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openPasswordDialog(user.id || user._id || "")}
                        title={t("admin.users.changePassword") || "Change Password"}
                      >
                        <Key className="h-4 w-4 text-orange-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive/90"
                        onClick={() => handleDelete(user.id || user._id || "")}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex justify-center">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => handlePageChange(page - 1)}
                className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <PaginationItem key={p}>
                <PaginationLink
                  isActive={page === p}
                  onClick={() => handlePageChange(p)}
                  className="cursor-pointer"
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => handlePageChange(page + 1)}
                className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
