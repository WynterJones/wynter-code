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
