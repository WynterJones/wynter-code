// Netlify FTP Types - Retro FTP-style deployment interface

export interface NetlifySite {
  id: string;
  name: string;
  url: string;
  ssl_url: string;
  admin_url: string;
  screenshot_url: string | null;
  created_at: string;
  updated_at: string;
  custom_domain: string | null;
  domain_aliases: string[];
  default_hooks_data: {
    access_token?: string;
  } | null;
  build_settings: {
    repo_url?: string;
    repo_branch?: string;
    cmd?: string;
    dir?: string;
  } | null;
  processing_settings: {
    html?: { pretty_urls?: boolean };
  } | null;
  published_deploy?: NetlifyDeploy;
}

export interface NetlifyDeploy {
  id: string;
  site_id: string;
  state: 'new' | 'pending_review' | 'accepted' | 'rejected' | 'enqueued' | 'building' | 'uploading' | 'uploaded' | 'preparing' | 'prepared' | 'processing' | 'ready' | 'error' | 'retrying';
  name: string;
  url: string;
  ssl_url: string;
  admin_url: string;
  deploy_url: string;
  deploy_ssl_url: string;
  screenshot_url: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  title: string | null;
  branch: string | null;
  commit_ref: string | null;
  commit_url: string | null;
  review_id: number | null;
  error_message: string | null;
  context: string;
}

export interface NetlifyDomain {
  hostname: string;
  configured: boolean;
  verified: boolean;
  certificate?: {
    state: string;
    domains: string[];
    expires_at: string;
  } | null;
}

export interface DeployConfig {
  siteId: string;
  file: File;
  title?: string;
  draft?: boolean;
}

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export interface SiteGroup {
  id: string;
  name: string;
  isCollapsed: boolean;
  siteIds: string[];
}

export interface NetlifyFtpState {
  // Auth
  apiToken: string | null;
  connectionStatus: ConnectionStatus;
  connectionError: string | null;
  
  // Sites
  sites: NetlifySite[];
  currentSiteId: string | null;
  isLoadingSites: boolean;
  
  // Deploys
  deploys: Map<string, NetlifyDeploy[]>;
  isLoadingDeploys: boolean;
  
  // Upload
  isDeploying: boolean;
  deployProgress: number;
  deployMessage: string;
}

export interface DeployHistoryEntry {
  deploy: NetlifyDeploy;
  isLive: boolean;
  timeAgo: string;
}

// Retro UI specific types
export interface RetroTheme {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  textDim: string;
  border: string;
  borderLight: string;
  borderDark: string;
  scanlines: boolean;
  crtGlow: boolean;
}

export const RETRO_THEMES: Record<string, RetroTheme> = {
  classic: {
    primary: '#c0c0c0',
    secondary: '#808080',
    accent: '#000080',
    text: '#000000',
    textDim: '#555555',
    border: '#dfdfdf',
    borderLight: '#ffffff',
    borderDark: '#404040',
    scanlines: false,
    crtGlow: false,
  },
  terminal: {
    primary: '#0a0a0a',
    secondary: '#1a1a1a',
    accent: '#00ff00',
    text: '#00ff00',
    textDim: '#00aa00',
    border: '#00ff00',
    borderLight: '#00ff00',
    borderDark: '#005500',
    scanlines: true,
    crtGlow: true,
  },
  amber: {
    primary: '#0a0a0a',
    secondary: '#1a1a1a', 
    accent: '#ffb000',
    text: '#ffb000',
    textDim: '#aa7500',
    border: '#ffb000',
    borderLight: '#ffcc00',
    borderDark: '#775500',
    scanlines: true,
    crtGlow: true,
  },
};
