import { UserRole } from './firestore';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface UserProfileResponse {
  id: string;
  name: string;
  iconUrl: string;
  role: UserRole;
  isXLinked: boolean;
  xid?: string;
}
