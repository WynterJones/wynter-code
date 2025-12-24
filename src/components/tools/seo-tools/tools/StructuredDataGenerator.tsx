import { useState } from "react";
import { Copy, Check, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type SchemaType = "Organization" | "LocalBusiness" | "Product" | "Article" | "FAQPage" | "BreadcrumbList" | "Person" | "WebSite";

interface SchemaTypeInfo {
  id: SchemaType;
  name: string;
  description: string;
}

const SCHEMA_TYPES: SchemaTypeInfo[] = [
  { id: "Organization", name: "Organization", description: "Company or organization info" },
  { id: "LocalBusiness", name: "Local Business", description: "Physical business location" },
  { id: "Product", name: "Product", description: "E-commerce product data" },
  { id: "Article", name: "Article", description: "Blog post or news article" },
  { id: "FAQPage", name: "FAQ Page", description: "Frequently asked questions" },
  { id: "BreadcrumbList", name: "Breadcrumbs", description: "Navigation breadcrumbs" },
  { id: "Person", name: "Person", description: "Individual person info" },
  { id: "WebSite", name: "Website", description: "Site-level information" },
];

interface FaqItem {
  question: string;
  answer: string;
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

export function StructuredDataGenerator() {
  const [schemaType, setSchemaType] = useState<SchemaType>("Organization");
  const [copied, setCopied] = useState(false);

  // Organization/LocalBusiness fields
  const [orgName, setOrgName] = useState("");
  const [orgUrl, setOrgUrl] = useState("");
  const [orgLogo, setOrgLogo] = useState("");
  const [orgDescription, setOrgDescription] = useState("");

  // LocalBusiness specific
  const [address, setAddress] = useState({ street: "", city: "", state: "", postal: "", country: "" });
  const [phone, setPhone] = useState("");

  // Product fields
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productImage, setProductImage] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productCurrency, setProductCurrency] = useState("USD");
  const [productAvailability, setProductAvailability] = useState("InStock");

  // Article fields
  const [articleHeadline, setArticleHeadline] = useState("");
  const [articleAuthor, setArticleAuthor] = useState("");
  const [articleDatePublished, setArticleDatePublished] = useState("");
  const [articleImage, setArticleImage] = useState("");

  // FAQ fields
  const [faqItems, setFaqItems] = useState<FaqItem[]>([{ question: "", answer: "" }]);

  // Breadcrumb fields
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ name: "Home", url: "/" }]);

  // Person fields
  const [personName, setPersonName] = useState("");
  const [personJobTitle, setPersonJobTitle] = useState("");
  const [personImage, setPersonImage] = useState("");

  // Website fields
  const [siteName, setSiteName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [searchUrl, setSearchUrl] = useState("");

  const generateJsonLd = (): string => {
    let schema: Record<string, unknown> = {};

    switch (schemaType) {
      case "Organization":
        schema = {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: orgName || undefined,
          url: orgUrl || undefined,
          logo: orgLogo || undefined,
          description: orgDescription || undefined,
        };
        break;

      case "LocalBusiness":
        schema = {
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: orgName || undefined,
          url: orgUrl || undefined,
          logo: orgLogo || undefined,
          description: orgDescription || undefined,
          telephone: phone || undefined,
          address: (address.street || address.city) ? {
            "@type": "PostalAddress",
            streetAddress: address.street || undefined,
            addressLocality: address.city || undefined,
            addressRegion: address.state || undefined,
            postalCode: address.postal || undefined,
            addressCountry: address.country || undefined,
          } : undefined,
        };
        break;

      case "Product":
        schema = {
          "@context": "https://schema.org",
          "@type": "Product",
          name: productName || undefined,
          description: productDescription || undefined,
          image: productImage || undefined,
          offers: {
            "@type": "Offer",
            price: productPrice || undefined,
            priceCurrency: productCurrency,
            availability: `https://schema.org/${productAvailability}`,
          },
        };
        break;

      case "Article":
        schema = {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: articleHeadline || undefined,
          author: articleAuthor ? { "@type": "Person", name: articleAuthor } : undefined,
          datePublished: articleDatePublished || undefined,
          image: articleImage || undefined,
        };
        break;

      case "FAQPage":
        schema = {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqItems.filter(f => f.question && f.answer).map(item => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        };
        break;

      case "BreadcrumbList":
        schema = {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: breadcrumbs.filter(b => b.name && b.url).map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: item.url,
          })),
        };
        break;

      case "Person":
        schema = {
          "@context": "https://schema.org",
          "@type": "Person",
          name: personName || undefined,
          jobTitle: personJobTitle || undefined,
          image: personImage || undefined,
        };
        break;

      case "WebSite":
        schema = {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: siteName || undefined,
          url: siteUrl || undefined,
          potentialAction: searchUrl ? {
            "@type": "SearchAction",
            target: `${searchUrl}{search_term_string}`,
            "query-input": "required name=search_term_string",
          } : undefined,
        };
        break;
    }

    // Remove undefined values
    const cleanSchema = JSON.parse(JSON.stringify(schema));
    return JSON.stringify(cleanSchema, null, 2);
  };

  const handleCopy = async () => {
    const code = `<script type="application/ld+json">\n${generateJsonLd()}\n</script>`;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addFaqItem = () => setFaqItems([...faqItems, { question: "", answer: "" }]);
  const removeFaqItem = (index: number) => setFaqItems(faqItems.filter((_, i) => i !== index));
  const updateFaqItem = (index: number, field: "question" | "answer", value: string) => {
    const updated = [...faqItems];
    updated[index][field] = value;
    setFaqItems(updated);
  };

  const addBreadcrumb = () => setBreadcrumbs([...breadcrumbs, { name: "", url: "" }]);
  const removeBreadcrumb = (index: number) => setBreadcrumbs(breadcrumbs.filter((_, i) => i !== index));
  const updateBreadcrumb = (index: number, field: "name" | "url", value: string) => {
    const updated = [...breadcrumbs];
    updated[index][field] = value;
    setBreadcrumbs(updated);
  };

  return (
    <div className="flex flex-col gap-6 h-full p-4">
      <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Form Section */}
        <div className="space-y-4 overflow-auto pr-2">
          <h3 className="font-medium text-text-primary">Schema Type</h3>

          {/* Type Selector */}
          <div className="grid grid-cols-2 gap-2">
            {SCHEMA_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setSchemaType(type.id)}
                className={cn(
                  "p-3 rounded-lg border text-left transition-colors",
                  schemaType === type.id
                    ? "bg-accent/10 border-accent text-text-primary"
                    : "bg-bg-secondary border-border text-text-secondary hover:border-border-hover"
                )}
              >
                <div className="font-medium text-sm">{type.name}</div>
                <div className="text-xs text-text-tertiary mt-0.5">{type.description}</div>
              </button>
            ))}
          </div>

          {/* Dynamic Fields */}
          <div className="border-t border-border pt-4 space-y-4">
            {(schemaType === "Organization" || schemaType === "LocalBusiness") && (
              <>
                <Input label="Name" value={orgName} onChange={setOrgName} placeholder="Company Name" />
                <Input label="URL" value={orgUrl} onChange={setOrgUrl} placeholder="https://example.com" />
                <Input label="Logo URL" value={orgLogo} onChange={setOrgLogo} placeholder="https://example.com/logo.png" />
                <Textarea label="Description" value={orgDescription} onChange={setOrgDescription} />
              </>
            )}

            {schemaType === "LocalBusiness" && (
              <>
                <Input label="Phone" value={phone} onChange={setPhone} placeholder="+1-555-555-5555" />
                <Input label="Street Address" value={address.street} onChange={(v) => setAddress({ ...address, street: v })} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="City" value={address.city} onChange={(v) => setAddress({ ...address, city: v })} />
                  <Input label="State" value={address.state} onChange={(v) => setAddress({ ...address, state: v })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Postal Code" value={address.postal} onChange={(v) => setAddress({ ...address, postal: v })} />
                  <Input label="Country" value={address.country} onChange={(v) => setAddress({ ...address, country: v })} />
                </div>
              </>
            )}

            {schemaType === "Product" && (
              <>
                <Input label="Product Name" value={productName} onChange={setProductName} />
                <Textarea label="Description" value={productDescription} onChange={setProductDescription} />
                <Input label="Image URL" value={productImage} onChange={setProductImage} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Price" value={productPrice} onChange={setProductPrice} placeholder="29.99" />
                  <Select label="Currency" value={productCurrency} onChange={setProductCurrency} options={["USD", "EUR", "GBP", "CAD", "AUD"]} />
                </div>
                <Select label="Availability" value={productAvailability} onChange={setProductAvailability} options={["InStock", "OutOfStock", "PreOrder", "Discontinued"]} />
              </>
            )}

            {schemaType === "Article" && (
              <>
                <Input label="Headline" value={articleHeadline} onChange={setArticleHeadline} />
                <Input label="Author" value={articleAuthor} onChange={setArticleAuthor} />
                <Input label="Date Published" type="date" value={articleDatePublished} onChange={setArticleDatePublished} />
                <Input label="Image URL" value={articleImage} onChange={setArticleImage} />
              </>
            )}

            {schemaType === "FAQPage" && (
              <>
                {faqItems.map((item, index) => (
                  <div key={index} className="p-3 bg-bg-secondary rounded-lg border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-secondary">Question {index + 1}</span>
                      {faqItems.length > 1 && (
                        <button onClick={() => removeFaqItem(index)} className="p-1 text-red-400 hover:bg-red-400/10 rounded">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={item.question}
                      onChange={(e) => updateFaqItem(index, "question", e.target.value)}
                      placeholder="Question"
                      className="w-full px-3 py-2 bg-bg-primary border border-border rounded text-text-primary text-sm"
                    />
                    <textarea
                      value={item.answer}
                      onChange={(e) => updateFaqItem(index, "answer", e.target.value)}
                      placeholder="Answer"
                      rows={2}
                      className="w-full px-3 py-2 bg-bg-primary border border-border rounded text-text-primary text-sm resize-none"
                    />
                  </div>
                ))}
                <Button size="sm" variant="default" onClick={addFaqItem} className="w-full">
                  <Plus className="w-3 h-3 mr-1" /> Add Question
                </Button>
              </>
            )}

            {schemaType === "BreadcrumbList" && (
              <>
                {breadcrumbs.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary w-4">{index + 1}.</span>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateBreadcrumb(index, "name", e.target.value)}
                      placeholder="Name"
                      className="flex-1 px-3 py-2 bg-bg-secondary border border-border rounded text-text-primary text-sm"
                    />
                    <input
                      type="text"
                      value={item.url}
                      onChange={(e) => updateBreadcrumb(index, "url", e.target.value)}
                      placeholder="/path"
                      className="flex-1 px-3 py-2 bg-bg-secondary border border-border rounded text-text-primary text-sm"
                    />
                    {breadcrumbs.length > 1 && (
                      <button onClick={() => removeBreadcrumb(index)} className="p-1 text-red-400 hover:bg-red-400/10 rounded">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
                <Button size="sm" variant="default" onClick={addBreadcrumb} className="w-full">
                  <Plus className="w-3 h-3 mr-1" /> Add Breadcrumb
                </Button>
              </>
            )}

            {schemaType === "Person" && (
              <>
                <Input label="Name" value={personName} onChange={setPersonName} />
                <Input label="Job Title" value={personJobTitle} onChange={setPersonJobTitle} />
                <Input label="Image URL" value={personImage} onChange={setPersonImage} />
              </>
            )}

            {schemaType === "WebSite" && (
              <>
                <Input label="Site Name" value={siteName} onChange={setSiteName} />
                <Input label="Site URL" value={siteUrl} onChange={setSiteUrl} placeholder="https://example.com" />
                <Input label="Search URL (optional)" value={searchUrl} onChange={setSearchUrl} placeholder="https://example.com/search?q=" />
              </>
            )}
          </div>
        </div>

        {/* Output Section */}
        <div className="flex flex-col gap-4 overflow-auto">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-text-primary">Generated JSON-LD</h3>
            <Button size="sm" onClick={handleCopy}>
              {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <pre className="flex-1 p-4 bg-bg-secondary rounded-lg border border-border text-sm font-mono text-text-primary overflow-auto whitespace-pre-wrap">
            {`<script type="application/ld+json">\n${generateJsonLd()}\n</script>`}
          </pre>
        </div>
      </div>
    </div>
  );
}

// Helper components
function Input({ label, value, onChange, placeholder, type = "text" }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm text-text-secondary mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
      />
    </div>
  );
}

function Textarea({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm text-text-secondary mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent resize-none"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="block text-sm text-text-secondary mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}
