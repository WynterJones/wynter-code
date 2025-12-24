import { useState } from "react";
import { Copy, Check, Plus, Trash2, Bot } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ContentItem {
  title: string;
  path: string;
}

export function LlmsTxtGenerator() {
  const [siteName, setSiteName] = useState("");
  const [description, setDescription] = useState("");
  const [mainContent, setMainContent] = useState<ContentItem[]>([
    { title: "Home", path: "/" }
  ]);
  const [documentation, setDocumentation] = useState<ContentItem[]>([]);
  const [optional, setOptional] = useState<ContentItem[]>([]);
  const [copied, setCopied] = useState(false);

  const generateCode = () => {
    const lines: string[] = [];

    // Header
    if (siteName) {
      lines.push(`# ${siteName}`);
      lines.push("");
    }

    // Description
    if (description) {
      lines.push(`> ${description}`);
      lines.push("");
    }

    // Main Content
    if (mainContent.some(item => item.title && item.path)) {
      lines.push("## Main Content");
      mainContent.forEach(item => {
        if (item.title && item.path) {
          lines.push(`- ${item.title}: ${item.path}`);
        }
      });
      lines.push("");
    }

    // Documentation
    if (documentation.some(item => item.title && item.path)) {
      lines.push("## Documentation");
      documentation.forEach(item => {
        if (item.title && item.path) {
          lines.push(`- ${item.title}: ${item.path}`);
        }
      });
      lines.push("");
    }

    // Optional
    if (optional.some(item => item.title && item.path)) {
      lines.push("## Optional");
      optional.forEach(item => {
        if (item.title && item.path) {
          lines.push(`- ${item.title}: ${item.path}`);
        }
      });
    }

    return lines.join("\n").trim();
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generateCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addItem = (
    setter: React.Dispatch<React.SetStateAction<ContentItem[]>>,
    items: ContentItem[]
  ) => {
    setter([...items, { title: "", path: "" }]);
  };

  const updateItem = (
    setter: React.Dispatch<React.SetStateAction<ContentItem[]>>,
    items: ContentItem[],
    index: number,
    field: "title" | "path",
    value: string
  ) => {
    const updated = [...items];
    updated[index][field] = value;
    setter(updated);
  };

  const removeItem = (
    setter: React.Dispatch<React.SetStateAction<ContentItem[]>>,
    items: ContentItem[],
    index: number
  ) => {
    setter(items.filter((_, i) => i !== index));
  };

  const ContentSection = ({
    title,
    items,
    setItems,
    description: desc,
  }: {
    title: string;
    items: ContentItem[];
    setItems: React.Dispatch<React.SetStateAction<ContentItem[]>>;
    description: string;
  }) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <label className="block text-sm font-medium text-text-primary">{title}</label>
          <span className="text-xs text-text-tertiary">{desc}</span>
        </div>
        <button
          onClick={() => addItem(setItems, items)}
          className="p-1 text-accent hover:bg-accent/10 rounded"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2 mb-2">
          <input
            type="text"
            value={item.title}
            onChange={(e) => updateItem(setItems, items, index, "title", e.target.value)}
            placeholder="Title"
            className="flex-1 px-3 py-2 bg-bg-secondary border border-border rounded text-text-primary text-sm"
          />
          <input
            type="text"
            value={item.path}
            onChange={(e) => updateItem(setItems, items, index, "path", e.target.value)}
            placeholder="/path"
            className="flex-1 px-3 py-2 bg-bg-secondary border border-border rounded text-text-primary text-sm font-mono"
          />
          <button
            onClick={() => removeItem(setItems, items, index)}
            className="p-1 text-red-400 hover:bg-red-400/10 rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-6 h-full p-4">
      <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Form Section */}
        <div className="space-y-4 overflow-auto pr-2">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-accent" />
            <h3 className="font-medium text-text-primary">LLMs.txt Configuration</h3>
          </div>

          <div className="p-3 bg-accent/5 rounded-lg border border-accent/20">
            <p className="text-xs text-text-secondary">
              LLMs.txt is a proposed standard that helps AI systems understand your site content.
              Place this file at your site root (e.g., example.com/llms.txt).
            </p>
          </div>

          {/* Site Name */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">Site Name</label>
            <input
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="Your Website Name"
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-text-secondary mb-1">Site Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of what your site offers"
              rows={2}
              className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>

          {/* Content Sections */}
          <ContentSection
            title="Main Content"
            description="Key pages and features"
            items={mainContent}
            setItems={setMainContent}
          />

          <ContentSection
            title="Documentation"
            description="Docs, guides, API references"
            items={documentation}
            setItems={setDocumentation}
          />

          <ContentSection
            title="Optional"
            description="Contact, about, legal pages"
            items={optional}
            setItems={setOptional}
          />
        </div>

        {/* Output Section */}
        <div className="flex flex-col gap-4 overflow-auto">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-text-primary">Generated llms.txt</h3>
            <Button size="sm" onClick={handleCopy}>
              {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>

          <pre className="flex-1 p-4 bg-bg-secondary rounded-lg border border-border text-sm font-mono text-text-primary overflow-auto whitespace-pre-wrap">
            {generateCode() || "# Your Site Name\n\n> Site description here\n\n## Main Content\n- Home: /"}
          </pre>

          {/* Format Guide */}
          <div className="p-3 bg-bg-secondary rounded-lg border border-border">
            <h4 className="text-sm font-medium text-text-primary mb-2">Format Guide</h4>
            <ul className="text-xs text-text-secondary space-y-1">
              <li><code className="bg-bg-tertiary px-1 rounded">#</code> Site name as heading</li>
              <li><code className="bg-bg-tertiary px-1 rounded">&gt;</code> Blockquote for description</li>
              <li><code className="bg-bg-tertiary px-1 rounded">##</code> Section headings</li>
              <li><code className="bg-bg-tertiary px-1 rounded">-</code> List items with title: path</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
