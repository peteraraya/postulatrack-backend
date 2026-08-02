export interface RawOffer {
  externalId: string;
  title: string;
  company: string;
  location?: string;
  country?: string;
  isRemote: boolean;
  description: string;
  url: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  skills: string[];
  seniority?: string;
  applicationsCount?: number;
  perks?: string[];
}

export interface IJobScraper {
  search(query: string, location?: string): Promise<RawOffer[]>;
}
