import type { LucideIcon } from "lucide-react";

export interface DomainTool {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
}

export interface WhoisResult {
  domainName: string;
  registrar: string;
  registrarUrl?: string;
  creationDate: string;
  expirationDate: string;
  updatedDate?: string;
  status: string[];
  nameServers: string[];
  dnssec?: string;
  registrant?: {
    name?: string;
    organization?: string;
    country?: string;
  };
  raw: string;
}

export interface DnsRecord {
  type: string;
  name: string;
  value: string;
  ttl?: number;
  priority?: number;
}

export interface SslInfo {
  issuer: string;
  subject: string;
  validFrom: string;
  validTo: string;
  daysRemaining: number;
  serialNumber: string;
  fingerprint: string;
  protocol: string;
  cipher: string;
  isValid: boolean;
  chain?: Array<{
    subject: string;
    issuer: string;
    validTo: string;
  }>;
}

export interface HttpHeader {
  name: string;
  value: string;
}

export interface RedirectHop {
  url: string;
  statusCode: number;
  headers: HttpHeader[];
}

export interface IpInfo {
  ip: string;
  hostname?: string;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  loc?: string;
  org?: string;
  postal?: string;
  timezone?: string;
}
