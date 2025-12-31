export interface EnvVariable {
  key: string;
  value: string;
  isSensitive: boolean;
  comment?: string;
  lineNumber?: number;
}

export interface EnvFile {
  filename: string;
  path: string;
  variables: EnvVariable[];
  exists: boolean;
  isGitignored: boolean;
  lastModified?: number;
}

export interface EnvFileComparison {
  key: string;
  files: {
    filename: string;
    value: string | null;
    isSensitive: boolean;
  }[];
}

export interface GlobalEnvVariable {
  id: string;
  key: string;
  value: string;
  isSensitive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SystemEnvVar {
  key: string;
  value: string;
}
