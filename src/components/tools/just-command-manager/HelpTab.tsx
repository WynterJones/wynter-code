import { ExternalLink, Book, Github } from "lucide-react";
import { open } from "@tauri-apps/plugin-shell";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";

const resources = [
  {
    title: "Just Manual",
    description: "Complete documentation for just",
    url: "https://just.systems/man/en/",
    icon: Book,
  },
  {
    title: "GitHub Repository",
    description: "Source code and issue tracker",
    url: "https://github.com/casey/just",
    icon: Github,
  },
];

const quickReference = [
  { syntax: "recipe:", description: "Define a recipe" },
  { syntax: "recipe param:", description: "Recipe with parameter" },
  { syntax: "recipe param='default':", description: "Parameter with default" },
  { syntax: "recipe: dep1 dep2", description: "Recipe with dependencies" },
  { syntax: "@recipe:", description: "Quiet recipe (no echo)" },
  { syntax: "_recipe:", description: "Private recipe (hidden from list)" },
  { syntax: "-recipe:", description: "Recipe that can fail" },
  { syntax: "{{variable}}", description: "Variable interpolation" },
  { syntax: "name := 'value'", description: "Variable assignment" },
  { syntax: "set shell := ['bash', '-c']", description: "Set default shell" },
  { syntax: "alias r := recipe", description: "Create alias" },
];

export function HelpTab() {
  return (
    <OverlayScrollbarsComponent
      className="h-full"
      options={{
        scrollbars: { theme: "os-theme-custom", autoHide: "leave" },
      }}
    >
      <div className="p-6 max-w-2xl mx-auto">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Just Command Reference
        </h2>

        <div className="mb-8">
          <h3 className="text-sm font-medium text-text-secondary mb-3">
            Resources
          </h3>
          <div className="grid gap-3">
            {resources.map((resource) => {
              const Icon = resource.icon;
              return (
                <button
                  key={resource.url}
                  onClick={() => open(resource.url)}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-bg-secondary hover:bg-bg-hover transition-colors text-left group"
                >
                  <Icon className="w-5 h-5 text-accent" />
                  <div className="flex-1">
                    <div className="font-medium text-text-primary">
                      {resource.title}
                    </div>
                    <div className="text-sm text-text-secondary">
                      {resource.description}
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-text-secondary mb-3">
            Quick Reference
          </h3>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-bg-tertiary">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-text-secondary">
                    Syntax
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-text-secondary">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody>
                {quickReference.map((item, i) => (
                  <tr
                    key={i}
                    className="border-t border-border hover:bg-bg-hover/50"
                  >
                    <td className="px-4 py-2">
                      <code className="text-sm font-mono text-accent">
                        {item.syntax}
                      </code>
                    </td>
                    <td className="px-4 py-2 text-sm text-text-secondary">
                      {item.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </OverlayScrollbarsComponent>
  );
}
