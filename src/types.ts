export interface ImportManifestEntry {
  id: string;
  name: string;
  chunks: string[];
  async?: boolean;
}

export interface BundlerConfig {
  [bundlerId: string]: ImportManifestEntry;
}
