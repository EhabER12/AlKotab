/**
 * Schema Markup Service
 * Generates JSON-LD structured data for SEO
 */
export class SchemaMarkupService {
  constructor() {
    this.baseUrl = process.env.FRONTEND_URL || "https://genoun.com";
    this.siteName = "Genoun";
    this.logo = `${this.baseUrl}/logo.png`;
  }

  /**
   * Generate Article/BlogPosting schema
   */
  generateArticleSchema(article, locale = "ar") {
    const articleUrl = `${this.baseUrl}/${locale}/articles/${article.slug}`;
    const imageUrl = article.coverImage
      ? `${process.env.BASE_URL || this.baseUrl}${article.coverImage}`
      : this.logo;

    return {
      "@context": "https://schema.org",
      "@type": "Article",
      "@id": `${articleUrl}#article`,
      headline: article.title,
      description: article.excerpt || article.seo?.description || "",
      image: imageUrl,
      datePublished: article.publishedAt || article.createdAt,
      dateModified: article.updatedAt,
      author: {
        "@type": "Person",
        name: article.author?.name || "Genoun Team",
      },
      publisher: {
        "@type": "Organization",
        name: this.siteName,
        logo: {
          "@type": "ImageObject",
          url: this.logo,
        },
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": articleUrl,
      },
      inLanguage: locale === "ar" ? "ar-SA" : "en-US",
      keywords: article.seo?.keywords?.join(", ") || article.tags?.join(", "),
      wordCount: this.countWords(article.content),
      articleBody: this.stripHtml(article.content).substring(0, 500),
    };
  }

  /**
   * Generate Product schema with Offer
   */
  generateProductSchema(product, locale = "ar") {
    const productUrl = `${this.baseUrl}/${locale}/products/${product.slug}`;
    const name = locale === "ar" ? product.name?.ar : product.name?.en;
    const description =
      locale === "ar" ? product.description?.ar : product.description?.en;

    const imageUrl = product.images?.[0]
      ? `${process.env.BASE_URL || this.baseUrl}${product.images[0]}`
      : this.logo;

    // Get pricing - handle various pricing structures
    let price = product.basePrice || 0;
    let priceCurrency = product.currency || "EGP";

    if (product.pricingTiers && product.pricingTiers.length > 0) {
      price =
        product.pricingTiers[0].price ||
        product.pricingTiers[0].basePrice ||
        price;
      priceCurrency = product.pricingTiers[0].currency || priceCurrency;
    }

    return {
      "@context": "https://schema.org",
      "@type": "Product",
      "@id": `${productUrl}#product`,
      name: name,
      description: description,
      image: imageUrl,
      url: productUrl,
      brand: {
        "@type": "Brand",
        name: this.siteName,
      },
      offers: {
        "@type": "Offer",
        url: productUrl,
        price: price,
        priceCurrency: priceCurrency,
        availability: product.isActive
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
        seller: {
          "@type": "Organization",
          name: this.siteName,
        },
      },
      aggregateRating: product.rating
        ? {
            "@type": "AggregateRating",
            ratingValue: product.rating.average || 5,
            reviewCount: product.rating.count || 1,
          }
        : undefined,
    };
  }

  /**
   * Generate Service schema
   */
  generateServiceSchema(service, locale = "ar") {
    const serviceUrl = `${this.baseUrl}/${locale}/services/${service.slug}`;
    const name = locale === "ar" ? service.title?.ar : service.title?.en;
    const description =
      locale === "ar" ? service.description?.ar : service.description?.en;

    return {
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": `${serviceUrl}#service`,
      name: name,
      description: description,
      url: serviceUrl,
      provider: {
        "@type": "Organization",
        name: this.siteName,
        url: this.baseUrl,
      },
      areaServed: {
        "@type": "Country",
        name: "Saudi Arabia",
      },
      serviceType: name,
    };
  }

  /**
   * Generate FAQPage schema
   */
  generateFAQSchema(faqs) {
    if (!faqs || faqs.length === 0) return null;

    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    };
  }

  /**
   * Generate BreadcrumbList schema
   */
  generateBreadcrumbSchema(breadcrumbs, locale = "ar") {
    if (!breadcrumbs || breadcrumbs.length === 0) return null;

    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbs.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: item.url ? `${this.baseUrl}${item.url}` : undefined,
      })),
    };
  }

  /**
   * Generate Organization schema (for homepage)
   */
  generateOrganizationSchema() {
    return {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${this.baseUrl}#organization`,
      name: this.siteName,
      url: this.baseUrl,
      logo: this.logo,
      sameAs: [
        "https://twitter.com/genoun",
        "https://www.instagram.com/genoun",
        "https://www.linkedin.com/company/genoun",
      ],
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+966-XXX-XXXX",
        contactType: "customer service",
        availableLanguage: ["Arabic", "English"],
      },
    };
  }

  /**
   * Generate WebSite schema with SearchAction
   */
  generateWebSiteSchema() {
    return {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${this.baseUrl}#website`,
      url: this.baseUrl,
      name: this.siteName,
      description: "منصة جنون للمنتجات والخدمات الرقمية",
      publisher: {
        "@id": `${this.baseUrl}#organization`,
      },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${this.baseUrl}/ar/search?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
      inLanguage: ["ar-SA", "en-US"],
    };
  }

  /**
   * Helper: Count words in content
   */
  countWords(content) {
    if (!content) return 0;
    const plainText = this.stripHtml(content);
    return plainText.split(/\s+/).filter((word) => word.length > 0).length;
  }

  /**
   * Helper: Strip HTML tags
   */
  stripHtml(html) {
    if (!html) return "";
    return html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Convert schema to JSON-LD script tag
   */
  toScriptTag(schema) {
    if (!schema) return "";
    // Remove undefined values
    const cleaned = JSON.parse(JSON.stringify(schema));
    return `<script type="application/ld+json">${JSON.stringify(
      cleaned
    )}</script>`;
  }

  /**
   * Generate all schemas for a page
   */
  generatePageSchemas(page, data, locale = "ar") {
    const schemas = [];

    switch (page) {
      case "article":
        schemas.push(this.generateArticleSchema(data, locale));
        if (data.faqs) {
          schemas.push(this.generateFAQSchema(data.faqs));
        }
        break;

      case "product":
        schemas.push(this.generateProductSchema(data, locale));
        if (data.faqs) {
          schemas.push(this.generateFAQSchema(data.faqs));
        }
        break;

      case "service":
        schemas.push(this.generateServiceSchema(data, locale));
        break;

      case "home":
        schemas.push(this.generateOrganizationSchema());
        schemas.push(this.generateWebSiteSchema());
        break;

      default:
        schemas.push(this.generateWebSiteSchema());
    }

    return schemas.filter(Boolean);
  }
}

export default new SchemaMarkupService();
