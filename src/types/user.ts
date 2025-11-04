export type UserRole = 'super_admin' | 'user';

export interface Company {
  id: string;
  name: string;
  createdAt: Date;
}

export interface CompanySite {
  id: string;
  companyId: string;
  name: string;
  address: string;
  createdAt: Date;
}

export interface UserProfile {
  userId: string;
  email: string;
  role: UserRole;
  companyId?: string;
  siteId?: string;
  createdAt: Date;
}
