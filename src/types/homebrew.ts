export type PackageType = "formula" | "cask";

export interface BrewPackage {
  name: string;
  fullName: string;
  version: string;
  desc: string | null;
  homepage: string | null;
  installedOnRequest: boolean;
  outdated: boolean;
  pinned: boolean;
  packageType: PackageType;
}

export interface BrewSearchResult {
  name: string;
  desc: string | null;
  packageType: PackageType;
}

export interface BrewPackageInfo {
  name: string;
  fullName: string;
  version: string;
  desc: string | null;
  homepage: string | null;
  license: string | null;
  dependencies: string[];
  caveats: string | null;
  packageType: PackageType;
  installed: boolean;
  outdated: boolean;
}

export interface BrewTap {
  name: string;
  remote: string;
  isOfficial: boolean;
}

export interface BrewDoctorResult {
  issues: string[];
  warnings: string[];
  isHealthy: boolean;
  rawOutput: string;
}

export interface CommandOutput {
  stdout: string;
  stderr: string;
  success: boolean;
}

export type ViewMode = "installed" | "search" | "outdated" | "taps" | "doctor";
export type FilterType = "all" | "formula" | "cask";
