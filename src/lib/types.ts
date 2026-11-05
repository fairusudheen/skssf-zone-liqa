export interface BranchQuota {
  name: string;
  registered: number;
}

export interface PassData {
  name: string;
  branch: string;
  role: string;
  token: string;
  code: string;
  photoUrl?: string | null;
  qrDataUrl: string;
  createdAt?: string;
}

export interface RegistrationRow {
  id: string;
  registration_code: string;
  full_name: string;
  phone: string;
  branch_name: string;
  branch_key: string;
  role: string;
  created_at: string;
  qr_token: string;
  photo_key: string | null;
  checked_in_at: string | null;
}

export interface AttendanceResult {
  status: "checked-in" | "already-checked-in";
  registration: {
    code: string;
    name: string;
    branch: string;
    role: string;
    photoUrl?: string | null;
  };
  checkedInAt: string;
  totalCheckedIn: number;
}
