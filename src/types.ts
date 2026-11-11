export type User = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  referralCode: string;
  referredBy?: number | null;
  role: string;
  salesExecutive?: string | null;
  consultantId?: string;
  createdAt?: string;
  updatedAt?: string;
  referredByName?: string | null;
};

export type ReferralStat = {
  id: number;
  name: string;
  referrals: number;
};
