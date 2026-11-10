export type User = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  referralCode: string;
  referredBy?: number | null;
  role: string;
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
