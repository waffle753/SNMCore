export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'faculty' | 'student';
};

let session: { token: string; user: AuthUser } | null = null;

export const setAuthSession = (nextSession: { token: string; user: AuthUser }) => {
  session = nextSession;
};

export const getAuthToken = () => session?.token;

export const getAuthUser = () => session?.user;

export const clearAuthSession = () => {
  session = null;
};
