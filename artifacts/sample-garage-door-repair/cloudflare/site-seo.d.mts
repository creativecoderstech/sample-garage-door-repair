export interface SeoRecord {
  kind: string;
  slug: string;
  status: string;
  title: string;
  verificationStatus?: string;
  reviewedSeed?: boolean;
  [key: string]: unknown;
}
export function describeRoute(url: string, content: object[], settings?: object): {
  item?: SeoRecord;
  title: string;
  description: string;
  canonical: string;
  image: string;
  name: string;
  redirect: string | null;
  path: string;
  status: number;
  robots: string;
  origin: string;
  indexable: boolean;
  indexingAllowed: boolean;
  structuredData: object;
};