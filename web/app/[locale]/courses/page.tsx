"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { getCourses, getEnrolledCourses } from "@/store/services/courseService";
import { addCourseToCart, openCart } from "@/store/slices/cartSlice";
import { getCategories } from "@/store/slices/categorySlice";
import { getPublicWebsiteSettingsThunk } from "@/store/services/settingsService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Search,
  Star,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { PriceDisplay } from "@/components/currency/PriceDisplay";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import toast from "react-hot-toast";

export default function CoursesPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const t = useTranslations();
  const locale = params.locale as string;
  const isRtl = locale === "ar";

  const { courses, enrolledCourses, isLoading } = useAppSelector((state) => state.courses);
  const { categories } = useAppSelector((state) => state.categories);
  const { publicSettings } = useAppSelector((state) => state.settings);
  const { user } = useAppSelector((state) => state.auth);
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedAccess, setSelectedAccess] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Get courses page hero settings
  const heroSettings = publicSettings?.coursesPageHero;
  const isHeroEnabled = heroSettings?.isEnabled !== false;
  const heroLocale = isRtl ? "ar" : "en";
  const heroBadge =
    heroSettings?.badge?.[heroLocale]?.trim() ||
    (isRtl ? "دوراتنا التعليمية" : "Our Educational Courses");
  const heroTitle =
    heroSettings?.title?.[heroLocale]?.trim() ||
    (isRtl ? "ابدأ رحلتك في تحفيظ القرآن الكريم" : "Start Your Quran Memorization Journey");
  const heroSubtitle =
    heroSettings?.subtitle?.[heroLocale]?.trim() ||
    (isRtl ? "مع دوراتنا المتخصصة" : "With Our Specialized Courses");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const filters: any = { isPublished: true };
    if (debouncedSearch) filters.search = debouncedSearch;
    if (selectedCategory !== "all") filters.categoryId = selectedCategory;
    if (selectedLevel !== "all") filters.level = selectedLevel;
    if (selectedAccess !== "all") filters.accessType = selectedAccess;

    dispatch(getCourses(filters));
    dispatch(getCategories({ active: true }));
    dispatch(getPublicWebsiteSettingsThunk());
  }, [dispatch, debouncedSearch, selectedCategory, selectedLevel, selectedAccess]);

  useEffect(() => {
    if (user) {
      dispatch(getEnrolledCourses({ page: 1, limit: 500 }));
    }
  }, [dispatch, user]);

  const getTextValue = (value: any): string => {
    if (!value) return "";
    if (typeof value === "string") return value;
    return (isRtl ? value.ar : value.en) || value.en || value.ar || "";
  };

  const getLevelText = (level: string): string => {
    const levels: Record<string, { ar: string; en: string }> = {
      beginner: { ar: "مبتدئ", en: "Beginner" },
      intermediate: { ar: "متوسط", en: "Intermediate" },
      advanced: { ar: "متقدم", en: "Advanced" },
    };
    return isRtl ? levels[level]?.ar || level : levels[level]?.en || level;
  };

  const getAccessTypeText = (accessType: string): string => {
    const types: Record<string, { ar: string; en: string }> = {
      free: { ar: "مجاني", en: "Free" },
      paid: { ar: "مدفوع", en: "Paid" },
      byPackage: { ar: "بالباقة", en: "By Package" },
    };
    return isRtl ? types[accessType]?.ar || accessType : types[accessType]?.en || accessType;
  };

  // Courses are now filtered server-side
  const filteredCourses = courses;
  const enrolledCourseIds = new Set(
    (enrolledCourses || []).map((course: any) => String(course.id || course._id))
  );

  const isCourseEnrolled = (course: any) => {
    const courseId = String(course.id || course._id || "");
    return !!user && enrolledCourseIds.has(courseId);
  };

  const handleCourseClick = (slug: string | undefined) => {
    if (slug) {
      router.push(`/${locale}/courses/${slug}`);
    }
  };

  if (isLoading && courses.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-genoun-green border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir={isRtl ? "rtl" : "ltr"}>
      {/* Hero Section - Conditional */}
      {isHeroEnabled && (
        <div
          className="bg-gradient-to-r from-genoun-green to-green-600 text-white py-16"
          style={
            heroSettings?.backgroundImage
              ? {
                backgroundImage: `linear-gradient(rgba(26, 71, 42, 0.9), rgba(26, 71, 42, 0.9)), url(${heroSettings.backgroundImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
              : undefined
          }
        >
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              {/* Badge */}
              {heroBadge && (
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
                  <BookOpen className="w-5 h-5" />
                  <span className="text-sm font-medium">{heroBadge}</span>
                </div>
              )}

              {/* Title */}
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                {heroTitle}
              </h1>

              {/* Subtitle */}
              <p className="text-xl text-white/90">
                {heroSubtitle}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isRtl ? "بحث بعنواين الدورات..." : "Search courses..."}
              className={isRtl ? "pr-9" : "pl-9"}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Category Filter */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder={isRtl ? "التصنيف" : "Category"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRtl ? "جميع التصنيفات" : "All Categories"}</SelectItem>
              {categories
                .filter((cat) => cat.isActive)
                .map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {getTextValue(category.name)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          {/* Level Filter */}
          <Select value={selectedLevel} onValueChange={setSelectedLevel}>
            <SelectTrigger>
              <SelectValue placeholder={isRtl ? "المستوى" : "Level"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRtl ? "جميع المستويات" : "All Levels"}</SelectItem>
              <SelectItem value="beginner">{isRtl ? "مبتدئ" : "Beginner"}</SelectItem>
              <SelectItem value="intermediate">{isRtl ? "متوسط" : "Intermediate"}</SelectItem>
              <SelectItem value="advanced">{isRtl ? "متقدم" : "Advanced"}</SelectItem>
            </SelectContent>
          </Select>

          {/* Access Filter */}
          <Select value={selectedAccess} onValueChange={setSelectedAccess}>
            <SelectTrigger>
              <SelectValue placeholder={isRtl ? "نوع الوصول" : "Access Type"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRtl ? "الكل" : "All Access"}</SelectItem>
              <SelectItem value="free">{isRtl ? "مجاني" : "Free"}</SelectItem>
              <SelectItem value="paid">{isRtl ? "مدفوع" : "Paid"}</SelectItem>
              <SelectItem value="byPackage">{isRtl ? "بالباقة" : "Package"}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Courses Grid */}
        {filteredCourses.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold mb-2">
              {isRtl ? "لا توجد دورات متاحة" : "No courses available"}
            </h3>
            <p className="text-gray-600">
              {isRtl
                ? "لا توجد دورات تطابق معايير البحث الخاصة بك"
                : "No courses match your search criteria"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCourses.map((course) => (
              <div
                key={course.id || course._id}
                className="group flex flex-col bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
              >
                {/* Course Thumbnail */}
                <div
                  className="relative aspect-[4/3] overflow-hidden bg-gray-100 cursor-pointer"
                  onClick={() => handleCourseClick((course as any).slug)}
                >
                  {course.thumbnail ? (
                    <img
                      src={course.thumbnail}
                      alt={getTextValue(course.title)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-genoun-green/20 to-green-600/20">
                      <BookOpen className="h-12 w-12 text-genoun-green/50" />
                    </div>
                  )}

                  {/* Access Type Badge */}
                  <Badge
                    className={`absolute top-3 ${isRtl ? "left-3" : "right-3"} ${course.accessType === "free"
                        ? "bg-green-500 hover:bg-green-600"
                        : "bg-blue-500 hover:bg-blue-600"
                      }`}
                  >
                    {getAccessTypeText(course.accessType)}
                  </Badge>

                  {/* Level Badge */}
                  {course.level && (
                    <Badge className={`absolute top-3 ${isRtl ? "right-3" : "left-3"} bg-amber-500 hover:bg-amber-600`}>
                      {getLevelText(course.level)}
                    </Badge>
                  )}

                  {course.compareAtPrice &&
                    course.price &&
                    course.compareAtPrice > course.price && (
                      <Badge className={`absolute bottom-3 ${isRtl ? "left-3" : "right-3"} bg-red-500 hover:bg-red-600`}>
                        {`${Math.round(((course.compareAtPrice - course.price) / course.compareAtPrice) * 100)}% ${isRtl ? "\u062e\u0635\u0645" : "OFF"}`}
                      </Badge>
                    )}
                </div>

                {/* Course Info */}
                <div className="flex-1 flex flex-col p-4">
                  {/* Instructor */}
                  {course.instructorId && (
                    <p className="text-xs text-muted-foreground mb-1">
                      {getTextValue(course.instructorId.fullName)}
                    </p>
                  )}

                  {/* Title */}
                  <h3
                    className="font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-primary transition-colors cursor-pointer"
                    onClick={() => handleCourseClick((course as any).slug)}
                  >
                    {getTextValue(course.title)}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {getTextValue(course.description)}
                  </p>

                  {/* Rating & Stats */}
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="font-semibold text-xs">
                        {course.stats?.averageRating?.toFixed(1) || "4.5"}
                      </span>
                    </div>
                    <span className="text-muted-foreground text-xs">
                      ({course.stats?.totalReviews || 0})
                    </span>
                    {course.duration && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {course.duration} {isRtl ? "ساعة" : "hrs"}
                        </span>
                      </>
                    )}
                    <span className="text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      {course.contentStats?.lessonsCount || 0} {isRtl ? "درس" : "lessons"}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="flex items-center gap-2 mb-2">
                    {course.accessType === "free" ? (
                      <span className="text-xl font-bold text-green-600">
                        {isRtl ? "\u0645\u062c\u0627\u0646\u064a" : "Free"}
                      </span>
                    ) : course.price ? (
                      <div className="flex flex-col gap-1">
                        {course.compareAtPrice && course.compareAtPrice > course.price && (
                          <PriceDisplay
                            amount={course.compareAtPrice}
                            currency={course.currency as "SAR" | "EGP" | "USD"}
                            locale={isRtl ? "ar" : "en"}
                            className="text-sm [&>span:first-child]:text-muted-foreground [&>span:first-child]:font-medium [&>span:first-child]:line-through"
                          />
                        )}
                        <PriceDisplay
                          amount={course.price}
                          currency={course.currency as "SAR" | "EGP" | "USD"}
                          locale={isRtl ? "ar" : "en"}
                          className="text-xl"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {isRtl ? "\u0627\u0644\u0633\u0639\u0631 \u063a\u064a\u0631 \u0645\u062d\u062f\u062f" : "Price not set"}
                      </span>
                    )}
                  </div>

                  {/* Spacer to push button to bottom */}
                  <div className="flex-1" />

                  {/* Action Button - Always at bottom */}
                  <Button
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isCourseEnrolled(course)) {
                        handleCourseClick((course as any).slug);
                        return;
                      }
                      if (course.accessType === "paid") {
                        const courseId = (course.id || course._id) as string;
                        dispatch(
                          addCourseToCart({
                            course: {
                              id: courseId,
                              _id: course._id,
                              title: course.title,
                              slug: (course as any).slug || "",
                              shortDescription: course.shortDescription,
                              thumbnail: course.thumbnail,
                              accessType: course.accessType,
                              price: course.price,
                              currency: course.currency,
                            },
                            quantity: 1,
                          })
                        );
                        toast.success(
                          isRtl
                            ? "تمت إضافة الدورة للسلة"
                            : "Course added to cart"
                        );
                        dispatch(openCart());
                        return;
                      }
                      handleCourseClick((course as any).slug);
                    }}
                  >
                    <BookOpen className={`h-4 w-4 ${isRtl ? "ml-2" : "mr-2"}`} />
                    {isCourseEnrolled(course)
                      ? isRtl
                        ? "متابعة التعلم"
                        : "Continue Learning"
                      : course.accessType === "free"
                      ? isRtl
                        ? "سجل مجاناً"
                        : "Enroll Free"
                      : isRtl
                        ? "أضف للسلة"
                        : "Add to cart"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

