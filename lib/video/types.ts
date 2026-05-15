export interface VideoResult {
  url: string;
}

export interface VideoProvider {
  generate(leadId: string, screenshotPaths: string[]): Promise<VideoResult>;
}
