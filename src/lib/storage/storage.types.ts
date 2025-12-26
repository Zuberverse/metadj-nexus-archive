export interface StorageBucketFile {
  getMetadata(): Promise<[Record<string, unknown>]>;
  createReadStream(options?: { start?: number; end?: number }): NodeJS.ReadableStream;
}

export interface StorageBucket {
  file(path: string): StorageBucketFile;
}
