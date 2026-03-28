export function createAuthClient() {
  return {
    signIn: { email: async () => ({}) },
    signUp: { email: async () => ({}) },
    signOut: async () => {},
    useSession: () => ({ data: null, isPending: false }),
  };
}
