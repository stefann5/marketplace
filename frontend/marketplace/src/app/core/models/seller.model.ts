export interface SellerProfile {
  id: string;
  userId: string;
  tenantId: string;
  companyName: string;
  description: string;
  slug: string;
  contactPhone: string;
  contactEmail: string;
  contactAddress: string;
  logoUrl: string | null;
  status: string;
  documents: SellerDocument[];
  theme: SellerTheme | null;
  createdAt: string;
  updatedAt: string;
}

export interface SellerDocument {
  id: string;
  fileName: string;
  url: string;
  contentType: string;
  uploadedAt: string;
}

export interface SellerTheme {
  preset: string;
  primaryColor: string | null;
  fontFamily: string | null;
  borderRadius: string | null;
  bannerUrl: string | null;
  logoUrl: string | null;
}

export interface SellerRegistrationRequest {
  companyName: string;
  description: string;
  contactPhone: string;
  contactEmail: string;
  contactAddress?: string;
}

export interface UpdateProfileRequest {
  companyName: string;
  description: string;
  contactPhone: string;
  contactEmail: string;
  contactAddress?: string;
}

export interface ThemeRequest {
  preset: string;
  primaryColor?: string;
}
