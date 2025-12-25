import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { SimpleIcon } from "simple-icons";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LobeIconImport = () => Promise<any>;

// Lazy import lobehub icons to avoid loading all at once
const lobeHubIconMap: Record<string, LobeIconImport> = {
  "anthropic.com": () => import("@lobehub/icons/es/Anthropic"),
  "claude.ai": () => import("@lobehub/icons/es/Claude"),
  "openai.com": () => import("@lobehub/icons/es/OpenAI"),
  "chat.openai.com": () => import("@lobehub/icons/es/OpenAI"),
  "chatgpt.com": () => import("@lobehub/icons/es/OpenAI"),
  "platform.openai.com": () => import("@lobehub/icons/es/OpenAI"),
  "gemini.google.com": () => import("@lobehub/icons/es/Gemini"),
  "ai.google.dev": () => import("@lobehub/icons/es/Google"),
  "huggingface.co": () => import("@lobehub/icons/es/HuggingFace"),
  "replicate.com": () => import("@lobehub/icons/es/Replicate"),
  "cohere.com": () => import("@lobehub/icons/es/Cohere"),
  "mistral.ai": () => import("@lobehub/icons/es/Mistral"),
  "perplexity.ai": () => import("@lobehub/icons/es/Perplexity"),
  "groq.com": () => import("@lobehub/icons/es/Groq"),
  "together.ai": () => import("@lobehub/icons/es/Together"),
  "fireworks.ai": () => import("@lobehub/icons/es/Fireworks"),
  "deepmind.google": () => import("@lobehub/icons/es/DeepMind"),
  "deepseek.com": () => import("@lobehub/icons/es/DeepSeek"),
  "ollama.com": () => import("@lobehub/icons/es/Ollama"),
  "ollama.ai": () => import("@lobehub/icons/es/Ollama"),
  "midjourney.com": () => import("@lobehub/icons/es/Midjourney"),
  "stability.ai": () => import("@lobehub/icons/es/Stability"),
  "elevenlabs.io": () => import("@lobehub/icons/es/ElevenLabs"),
  "runwayml.com": () => import("@lobehub/icons/es/Runway"),
  "poe.com": () => import("@lobehub/icons/es/Poe"),
  "cursor.com": () => import("@lobehub/icons/es/Cursor"),
  "cursor.sh": () => import("@lobehub/icons/es/Cursor"),
  "github.com": () => import("@lobehub/icons/es/Github"),
  "copilot.github.com": () => import("@lobehub/icons/es/GithubCopilot"),
  "aws.amazon.com": () => import("@lobehub/icons/es/Aws"),
  "azure.microsoft.com": () => import("@lobehub/icons/es/Azure"),
  "cloud.google.com": () => import("@lobehub/icons/es/GoogleCloud"),
  "notion.so": () => import("@lobehub/icons/es/Notion"),
  "notion.com": () => import("@lobehub/icons/es/Notion"),
  "figma.com": () => import("@lobehub/icons/es/Figma"),
  "vercel.com": () => import("@lobehub/icons/es/Inference"),
  "replit.com": () => import("@lobehub/icons/es/Replit"),
  "colab.research.google.com": () => import("@lobehub/icons/es/Colab"),
  "kaggle.com": () => import("@lobehub/icons/es/Google"),
  "wandb.ai": () => import("@lobehub/icons/es/Inference"),
  "langchain.com": () => import("@lobehub/icons/es/LangChain"),
  "llamaindex.ai": () => import("@lobehub/icons/es/LlamaIndex"),
  "lmstudio.ai": () => import("@lobehub/icons/es/LmStudio"),
  "nvidia.com": () => import("@lobehub/icons/es/Nvidia"),
  "meta.ai": () => import("@lobehub/icons/es/MetaAI"),
  "llama.meta.com": () => import("@lobehub/icons/es/Meta"),
  "civitai.com": () => import("@lobehub/icons/es/Civitai"),
  "dify.ai": () => import("@lobehub/icons/es/Dify"),
  "n8n.io": () => import("@lobehub/icons/es/N8n"),
  "openrouter.ai": () => import("@lobehub/icons/es/OpenRouter"),
  "kimi.ai": () => import("@lobehub/icons/es/Kimi"),
  "moonshot.ai": () => import("@lobehub/icons/es/Moonshot"),
  "suno.ai": () => import("@lobehub/icons/es/Suno"),
  "suno.com": () => import("@lobehub/icons/es/Suno"),
  "udio.com": () => import("@lobehub/icons/es/Inference"),
  "fal.ai": () => import("@lobehub/icons/es/Fal"),
  "modal.com": () => import("@lobehub/icons/es/Inference"),
  "banana.dev": () => import("@lobehub/icons/es/Inference"),
  "gradio.app": () => import("@lobehub/icons/es/Gradio"),
  "streamlit.io": () => import("@lobehub/icons/es/Inference"),
  "pinecone.io": () => import("@lobehub/icons/es/Inference"),
  "weaviate.io": () => import("@lobehub/icons/es/Inference"),
  "qdrant.tech": () => import("@lobehub/icons/es/Inference"),
  "chroma.ai": () => import("@lobehub/icons/es/Inference"),
  "cline.ai": () => import("@lobehub/icons/es/Cline"),
  "phind.com": () => import("@lobehub/icons/es/Phind"),
  "tabnine.com": () => import("@lobehub/icons/es/Inference"),
  "codeium.com": () => import("@lobehub/icons/es/Inference"),
  "sourcegraph.com": () => import("@lobehub/icons/es/Inference"),
  "pieces.app": () => import("@lobehub/icons/es/Inference"),
  "continue.dev": () => import("@lobehub/icons/es/Inference"),
  "aider.chat": () => import("@lobehub/icons/es/Inference"),
  "docs.anthropic.com": () => import("@lobehub/icons/es/Anthropic"),
  "console.anthropic.com": () => import("@lobehub/icons/es/Anthropic"),
};

// Simple Icons mapping (domain to icon slug)
const simpleIconsMap: Record<string, string> = {
  "github.com": "github",
  "gitlab.com": "gitlab",
  "bitbucket.org": "bitbucket",
  "stackoverflow.com": "stackoverflow",
  "reddit.com": "reddit",
  "twitter.com": "x",
  "x.com": "x",
  "facebook.com": "facebook",
  "instagram.com": "instagram",
  "linkedin.com": "linkedin",
  "youtube.com": "youtube",
  "twitch.tv": "twitch",
  "discord.com": "discord",
  "discord.gg": "discord",
  "slack.com": "slack",
  "telegram.org": "telegram",
  "t.me": "telegram",
  "whatsapp.com": "whatsapp",
  "medium.com": "medium",
  "dev.to": "devdotto",
  "hashnode.com": "hashnode",
  "substack.com": "substack",
  "producthunt.com": "producthunt",
  "dribbble.com": "dribbble",
  "behance.net": "behance",
  "codepen.io": "codepen",
  "codesandbox.io": "codesandbox",
  "jsfiddle.net": "jsfiddle",
  "npmjs.com": "npm",
  "pypi.org": "pypi",
  "rubygems.org": "rubygems",
  "crates.io": "rust",
  "packagist.org": "packagist",
  "docker.com": "docker",
  "hub.docker.com": "docker",
  "kubernetes.io": "kubernetes",
  "terraform.io": "terraform",
  "ansible.com": "ansible",
  "jenkins.io": "jenkins",
  "circleci.com": "circleci",
  "travis-ci.com": "travisci",
  "netlify.com": "netlify",
  "vercel.com": "vercel",
  "heroku.com": "heroku",
  "digitalocean.com": "digitalocean",
  "linode.com": "linode",
  "vultr.com": "vultr",
  "cloudflare.com": "cloudflare",
  "fastly.com": "fastly",
  "akamai.com": "akamai",
  "mongodb.com": "mongodb",
  "postgresql.org": "postgresql",
  "mysql.com": "mysql",
  "redis.io": "redis",
  "elastic.co": "elasticsearch",
  "apache.org": "apache",
  "nginx.com": "nginx",
  "nodejs.org": "nodedotjs",
  "python.org": "python",
  "rust-lang.org": "rust",
  "golang.org": "go",
  "go.dev": "go",
  "typescriptlang.org": "typescript",
  "reactjs.org": "react",
  "react.dev": "react",
  "vuejs.org": "vuedotjs",
  "angular.io": "angular",
  "svelte.dev": "svelte",
  "nextjs.org": "nextdotjs",
  "nuxt.com": "nuxtdotjs",
  "remix.run": "remix",
  "astro.build": "astro",
  "tailwindcss.com": "tailwindcss",
  "getbootstrap.com": "bootstrap",
  "sass-lang.com": "sass",
  "lesscss.org": "less",
  "webpack.js.org": "webpack",
  "vitejs.dev": "vite",
  "esbuild.github.io": "esbuild",
  "rollupjs.org": "rollupdotjs",
  "parceljs.org": "parcel",
  "jestjs.io": "jest",
  "mochajs.org": "mocha",
  "cypress.io": "cypress",
  "playwright.dev": "playwright",
  "storybook.js.org": "storybook",
  "chromatic.com": "chromatic",
  "sentry.io": "sentry",
  "datadog.com": "datadog",
  "newrelic.com": "newrelic",
  "grafana.com": "grafana",
  "prometheus.io": "prometheus",
  "splunk.com": "splunk",
  "atlassian.com": "atlassian",
  "jira.com": "jira",
  "confluence.atlassian.com": "confluence",
  "trello.com": "trello",
  "asana.com": "asana",
  "monday.com": "monday",
  "clickup.com": "clickup",
  "linear.app": "linear",
  "airtable.com": "airtable",
  "zapier.com": "zapier",
  "ifttt.com": "ifttt",
  "make.com": "integromat",
  "stripe.com": "stripe",
  "paypal.com": "paypal",
  "square.com": "square",
  "shopify.com": "shopify",
  "woocommerce.com": "woocommerce",
  "magento.com": "magento",
  "bigcommerce.com": "bigcommerce",
  "salesforce.com": "salesforce",
  "hubspot.com": "hubspot",
  "mailchimp.com": "mailchimp",
  "sendgrid.com": "sendgrid",
  "twilio.com": "twilio",
  "auth0.com": "auth0",
  "okta.com": "okta",
  "onelogin.com": "onelogin",
  "apple.com": "apple",
  "microsoft.com": "microsoft",
  "google.com": "google",
  "amazon.com": "amazon",
  "wikipedia.org": "wikipedia",
  "archive.org": "internetarchive",
  "w3.org": "w3c",
  "mdn.io": "mdnwebdocs",
  "developer.mozilla.org": "mdnwebdocs",
  "caniuse.com": "caniuse",
  "css-tricks.com": "csstricks",
  "smashingmagazine.com": "smashingmagazine",
  "freecodecamp.org": "freecodecamp",
  "codecademy.com": "codecademy",
  "udemy.com": "udemy",
  "coursera.org": "coursera",
  "edx.org": "edx",
  "khanacademy.org": "khanacademy",
  "pluralsight.com": "pluralsight",
  "egghead.io": "egghead",
  "frontendmasters.com": "frontendmasters",
  "leetcode.com": "leetcode",
  "hackerrank.com": "hackerrank",
  "codewars.com": "codewars",
  "exercism.org": "exercism",
  "spotify.com": "spotify",
  "soundcloud.com": "soundcloud",
  "bandcamp.com": "bandcamp",
  "tidal.com": "tidal",
  "deezer.com": "deezer",
  "netflix.com": "netflix",
  "hulu.com": "hulu",
  "disneyplus.com": "disneyplus",
  "primevideo.com": "primevideo",
  "hbomax.com": "hbo",
  "crunchyroll.com": "crunchyroll",
  "imdb.com": "imdb",
  "rottentomatoes.com": "rottentomatoes",
  "letterboxd.com": "letterboxd",
  "goodreads.com": "goodreads",
  "pocket.com": "pocket",
  "instapaper.com": "instapaper",
  "raindrop.io": "raindrop",
  "pinboard.in": "pinboard",
  "evernote.com": "evernote",
  "onenote.com": "microsoftonenote",
  "dropbox.com": "dropbox",
  "box.com": "box",
  "drive.google.com": "googledrive",
  "onedrive.live.com": "microsoftonedrive",
  "icloud.com": "icloud",
  "1password.com": "1password",
  "lastpass.com": "lastpass",
  "bitwarden.com": "bitwarden",
  "dashlane.com": "dashlane",
  "proton.me": "proton",
  "protonmail.com": "protonmail",
  "tutanota.com": "tutanota",
  "fastmail.com": "fastmail",
  "zoho.com": "zoho",
  "adobe.com": "adobe",
  "canva.com": "canva",
  "sketch.com": "sketch",
  "invisionapp.com": "invision",
  "zeplin.io": "zeplin",
  "framer.com": "framer",
  "principle.app": "principle",
  "blender.org": "blender",
  "unity.com": "unity",
  "unrealengine.com": "unrealengine",
  "godotengine.org": "godotengine",
  "gamemaker.io": "gamemaker",
  "itch.io": "itchdotio",
  "steam.com": "steam",
  "steampowered.com": "steam",
  "epicgames.com": "epicgames",
  "gog.com": "gogdotcom",
  "ea.com": "ea",
  "ubisoft.com": "ubisoft",
  "playstation.com": "playstation",
  "xbox.com": "xbox",
  "nintendo.com": "nintendo",
  "tauri.app": "tauri",
  "electronjs.org": "electron",
  "flutter.dev": "flutter",
  "reactnative.dev": "react",
  "expo.dev": "expo",
  "capacitorjs.com": "capacitor",
  "ionicframework.com": "ionic",
  "nativescript.org": "nativescript",
};

interface BookmarkIconProps {
  url: string | null;
  faviconUrl?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-4 h-4 text-[10px]",
  md: "w-5 h-5 text-xs",
  lg: "w-6 h-6 text-sm",
};

const iconSizes = {
  sm: 16,
  md: 20,
  lg: 24,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LobeIconModule = any;

export function BookmarkIcon({
  url,
  faviconUrl,
  name,
  size = "md",
  className,
}: BookmarkIconProps) {
  // All hooks must be at the top, before any conditional returns
  const [lobeIcon, setLobeIcon] = useState<LobeIconModule | null>(null);
  const [lobeIconLoaded, setLobeIconLoaded] = useState(false);
  const [simpleIcon, setSimpleIcon] = useState<SimpleIcon | null>(null);
  const [simpleIconLoaded, setSimpleIconLoaded] = useState(false);
  const [faviconError, setFaviconError] = useState(false);

  const hostname = useMemo(() => {
    if (!url) return null;
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  }, [url]);

  const faviconSrc = useMemo(() => {
    if (faviconUrl) return faviconUrl;
    if (url) {
      try {
        const urlObj = new URL(url);
        return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
      } catch {
        return null;
      }
    }
    return null;
  }, [url, faviconUrl]);

  const fallbackLetter = name.charAt(0).toUpperCase();

  // Check for LobeHub icon
  useEffect(() => {
    if (!hostname) {
      setLobeIconLoaded(true);
      return;
    }

    const lobeImport = lobeHubIconMap[hostname];
    if (lobeImport) {
      lobeImport()
        .then((module) => {
          setLobeIcon(module as LobeIconModule);
          setLobeIconLoaded(true);
        })
        .catch(() => {
          setLobeIconLoaded(true);
        });
    } else {
      setLobeIconLoaded(true);
    }
  }, [hostname]);

  // Check for Simple Icons (load dynamically)
  useEffect(() => {
    if (!hostname || lobeIcon) {
      setSimpleIconLoaded(true);
      return;
    }

    const iconSlug = simpleIconsMap[hostname];
    if (iconSlug) {
      const iconKey = `si${iconSlug.charAt(0).toUpperCase()}${iconSlug.slice(1)}`;
      import("simple-icons")
        .then((module) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const icon = (module as any)[iconKey] as SimpleIcon | undefined;
          if (icon && typeof icon === "object" && "svg" in icon) {
            setSimpleIcon(icon);
          }
          setSimpleIconLoaded(true);
        })
        .catch(() => {
          setSimpleIconLoaded(true);
        });
    } else {
      setSimpleIconLoaded(true);
    }
  }, [hostname, lobeIcon]);

  // 1. Try LobeHub icon first (for AI products)
  if (lobeIcon?.default?.Avatar) {
    const AvatarComponent = lobeIcon.default.Avatar;
    return (
      <div className={cn("flex-shrink-0 rounded overflow-hidden", className)}>
        <AvatarComponent size={iconSizes[size]} />
      </div>
    );
  }

  // 2. Try Simple Icons (for brands)
  if (simpleIcon && lobeIconLoaded && simpleIconLoaded) {
    return (
      <div
        className={cn(
          "flex items-center justify-center flex-shrink-0 rounded",
          sizeClasses[size],
          className
        )}
        style={{ color: `#${simpleIcon.hex}` }}
        dangerouslySetInnerHTML={{
          __html: simpleIcon.svg.replace(
            "<svg",
            `<svg width="100%" height="100%" class="p-0.5"`
          ),
        }}
      />
    );
  }

  // 3. Fall back to favicon
  if (faviconSrc && !faviconError && lobeIconLoaded && simpleIconLoaded) {
    return (
      <img
        src={faviconSrc}
        alt={`${name} icon`}
        onError={() => setFaviconError(true)}
        className={cn(
          "rounded flex-shrink-0 object-contain",
          sizeClasses[size],
          className
        )}
      />
    );
  }

  // 4. Fallback to letter
  return (
    <div
      className={cn(
        "rounded flex items-center justify-center bg-accent/20 text-accent font-medium flex-shrink-0",
        sizeClasses[size],
        className
      )}
    >
      {fallbackLetter}
    </div>
  );
}
