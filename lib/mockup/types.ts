export interface MockupResult {
  url: string;
  screenshotPaths: string[];
}

export interface MockupProvider {
  build(leadId: string, brief: string, businessName: string, baseUrl?: string): Promise<MockupResult>;
}
