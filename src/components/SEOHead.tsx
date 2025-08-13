import { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  noindex?: boolean;
}

export function SEOHead({ 
  title = 'Portail Entreprise Flashback Fa',
  description = 'Portail de gestion des entreprises Discord - Dotations, Archives, Blanchiment et plus',
  canonical,
  noindex = false
}: SEOHeadProps) {
  useEffect(() => {
    // Update document title
    document.title = title.length > 60 ? title.substring(0, 57) + '...' : title;

    // Update or create meta description
    let metaDescription = document.querySelector('meta[name="description"]') as HTMLMetaElement;
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.name = 'description';
      document.head.appendChild(metaDescription);
    }
    metaDescription.content = description.length > 160 ? description.substring(0, 157) + '...' : description;

    // Update or create viewport meta
    let viewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    viewport.content = 'width=device-width, initial-scale=1';

    // Update or create canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonical || window.location.href.split('?')[0].split('#')[0];

    // Update or create robots meta
    let robotsMeta = document.querySelector('meta[name="robots"]') as HTMLMetaElement;
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.name = 'robots';
      document.head.appendChild(robotsMeta);
    }
    robotsMeta.content = noindex ? 'noindex, nofollow' : 'index, follow';

    // Add structured data (JSON-LD)
    let structuredData = document.querySelector('#structured-data') as HTMLScriptElement;
    if (!structuredData) {
      structuredData = document.createElement('script');
      structuredData.id = 'structured-data';
      structuredData.type = 'application/ld+json';
      document.head.appendChild(structuredData);
    }

    const jsonLD = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "Portail Entreprise Flashback Fa",
      "description": description,
      "url": canonical || window.location.href,
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web Browser",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      }
    };

    structuredData.textContent = JSON.stringify(jsonLD);
  }, [title, description, canonical, noindex]);

  return null;
}