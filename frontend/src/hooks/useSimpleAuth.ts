import { useState, useEffect, useCallback } from 'react';
import { User } from '@/lib/types';

export interface SimpleAuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useSimpleAuth() {
  const [authState, setAuthState] = useState<SimpleAuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Check for stored authentication on load
  useEffect(() => {
    const checkAuth = () => {
      try {
        const storedUser = localStorage.getItem('flashback_user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          setAuthState({
            user,
            isLoading: false,
            isAuthenticated: true,
          });
        } else {
          setAuthState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    };

    checkAuth();
  }, []);

  const signInWithDiscord = useCallback(() => {
    // For development, create a mock user
    const mockUser: User = {
      id: 'dev_user_123',
      name: 'Utilisateur Test',
      avatar: 'https://cdn.discordapp.com/avatars/123456789/avatar.png',
      discriminator: '1234'
    };

    localStorage.setItem('flashback_user', JSON.stringify(mockUser));
    setAuthState({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
    });
    
    // Force page refresh to trigger the authentication state change
    window.location.reload();
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem('flashback_user');
    setAuthState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
  }, []);

  return {
    ...authState,
    signInWithDiscord,
    signOut,
  };
}