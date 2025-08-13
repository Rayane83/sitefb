import { useState, useEffect, useCallback } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/lib/types';

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const createUserFromSupabase = useCallback((supabaseUser: SupabaseUser): User => ({
    id: supabaseUser.id,
    name: (supabaseUser.user_metadata?.full_name || 
           supabaseUser.user_metadata?.name || 
           supabaseUser.email || 
           'Utilisateur') as string,
    avatar: (supabaseUser.user_metadata?.avatar_url || 
             supabaseUser.user_metadata?.avatar) as string | undefined,
    discriminator: '',
  }), []);

  const updateAuthState = useCallback((session: Session | null) => {
    if (session?.user) {
      const user = createUserFromSupabase(session.user);
      setAuthState({
        user,
        session,
        isLoading: false,
        isAuthenticated: true,
      });
    } else {
      setAuthState({
        user: null,
        session: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, [createUserFromSupabase]);

  useEffect(() => {
    // Set up auth listener FIRST to catch all auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        updateAuthState(session);
      }
    );

    // THEN check for existing session (hydration)
    supabase.auth.getSession().then(({ data: { session } }) => {
      updateAuthState(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [updateAuthState]);

  const signInWithDiscord = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}${window.location.pathname}${window.location.search}`,
      },
    });
    
    if (error) {
      console.error('Auth error:', error);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }, []);

  return {
    ...authState,
    signInWithDiscord,
    signOut,
  };
}