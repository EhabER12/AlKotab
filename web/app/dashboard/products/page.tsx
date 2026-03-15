"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Plus,
  BookOpen,
  MoreHorizontal,
  Pencil,
  Trash,
  ShoppingBag,
  Star,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  getProducts,
  deleteProduct,
  toggleProductStatus,
  syncProductAnalytics,
  Product,
} from "@/store/slices/productSlice";
import { getCategories } from "@/store/slices/categorySlice";
import { useAdminLocale } from "@/hooks/dashboard/useAdminLocale";
import toast from "react-hot-toast";

// Get localized text helper
const getLocalizedText = (
  text: { ar: string; en: string } | string | undefined,
  locale: string
): string => {
  if (!text) return "";
  if (typeof text === "string") return text;
  return text[locale as "ar" | "en"] || text.en || text.ar || "";
};

export default function ProductsPage() {
  const dispatch = useAppDispatch();
  const { products, loading, error } = useAppSelector(
    (state) => state.products
  );
  const { categories } = useAppSelector((state) => state.categories);
  const { t, isRtl, locale } = useAdminLocale();

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    dispatch(getProducts({}));
    dispatch(getCategories({}));
  }, [dispatch]);

  const handleToggleStatus = async (
    product: Product,
    field: "isActive" | "isFeatured"
  ) => {
    try {
      await dispatch(
        toggleProductStatus({
          id: product.id,
          [field]: !product[field],
        })
      ).unwrap();
      toast.success(t("admin.products.productUpdated"));
    } catch (err) {
      toast.error(String(err));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await dispatch(deleteProduct(deleteId)).unwrap();
      toast.success(t("admin.products.productDeleted"));
    } catch (err) {
      toast.error(String(err));
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  // Filter products by category
  const filteredProducts =
    categoryFilter === "all"
      ? products
      : products.filter((p) => p.categoryId === categoryFilter);

  return (
    <div className="space-y-4 p-8" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {t("admin.products.title")}
          </h2>
          <p className="text-muted-foreground">
            {products.length} {t("admin.products.title").toLowerCase()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              setSyncing(true);
              try {
                const result = await dispatch(syncProductAnalytics()).unwrap();
                toast.success(
                  t("admin.dashboard.stats.views") +
                  `: ${result.synced} synced, ${result.errors} errors`
                );
                dispatch(getProducts({}));
              } catch (e) {
                toast.error("Failed to sync analytics");
              } finally {
                setSyncing(false);
              }
            }}
            disabled={syncing}
          >
            {syncing ? (
              <Loader2
                className={`h-4 w-4 animate-spin ${isRtl ? "ml-2" : "mr-2"}`}
              />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`}
              >
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 16h5v5" />
              </svg>
            )}
            Sync Analytics
          </Button>
          <Link href="/dashboard/products/create">
            <Button>
              <Plus className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
              {t("admin.products.createProduct")}
            </Button>
          </Link>
          <Link href="/dashboard/products/create?type=digital_book">
            <Button variant="outline">
              <BookOpen className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
              {locale === "ar" ? "إضافة منتج كتاب رقمي" : "Add Digital Book Product"}
            </Button>
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <p>{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t("admin.products.category")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {getLocalizedText(cat.name, locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Products Table */}
      {!loading && (
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.products.title")}</CardTitle>
            <CardDescription>{t("admin.products.createFirst")}</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ShoppingBag className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">
                  {t("admin.products.noProducts")}
                </h3>
                <p className="text-muted-foreground mt-1 mb-4">
                  {t("admin.products.createFirst")}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Link href="/dashboard/products/create">
                    <Button>
                      <Plus className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
                      {t("admin.products.createProduct")}
                    </Button>
                  </Link>
                  <Link href="/dashboard/products/create?type=digital_book">
                    <Button variant="outline">
                      <BookOpen className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
                      {locale === "ar" ? "إضافة منتج كتاب رقمي" : "Add Digital Book Product"}
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-start">{t("admin.products.productName")}</TableHead>
                      <TableHead className="text-start">{t("admin.products.category")}</TableHead>
                      <TableHead className="text-start">{t("admin.products.basePrice")}</TableHead>
                      <TableHead className="text-start">{t("admin.products.variants")}</TableHead>
                      <TableHead className="text-start">{t("admin.products.isActive")}</TableHead>
                      <TableHead className="text-start">{t("admin.products.isFeatured")}</TableHead>
                      <TableHead className="text-start">
                        {t("admin.dashboard.stats.viewsTitle")}
                      </TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            {product.coverImage && (
                              <img
                                src={product.coverImage}
                                alt=""
                                className="h-12 w-12 rounded-lg object-cover"
                              />
                            )}
                            <div>
                              <p className="font-semibold">
                                {getLocalizedText(product.name, locale)}
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {getLocalizedText(
                                  product.shortDescription,
                                  locale
                                )}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {product.category ? (
                            <Badge variant="secondary">
                              {getLocalizedText(product.category.name, locale)}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {product.basePrice} {product.currency || "EGP"}
                        </TableCell>
                        <TableCell>{product.variants?.length || 0}</TableCell>
                        <TableCell>
                          <Switch
                            checked={product.isActive}
                            onCheckedChange={() =>
                              handleToggleStatus(product, "isActive")
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant={product.isFeatured ? "default" : "ghost"}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              handleToggleStatus(product, "isFeatured")
                            }
                          >
                            <Star
                              className={`h-4 w-4 ${product.isFeatured
                                  ? "fill-current"
                                  : "text-muted-foreground"
                                }`}
                            />
                          </Button>
                        </TableCell>
                        <TableCell>{product.seoData?.views30d || 0}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <Link
                                href={`/dashboard/products/${product.id}/edit`}
                              >
                                <DropdownMenuItem>
                                  <Pencil
                                    className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"
                                      }`}
                                  />
                                  {t("common.edit")}
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => setDeleteId(product.id)}
                              >
                                <Trash
                                  className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`}
                                />
                                {t("common.delete")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.products.deleteConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("common.delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
