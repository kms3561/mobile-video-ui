import type { PropsWithChildren } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';

import type { Profile } from '../lib/database.types';
import {
  getProfile,
  needsUsernameSetup,
  updateProfileUsername,
  upsertProfile,
} from '../lib/queries';
import {
  hasSupabaseConfig,
  supabase,
  supabaseConfigError,
} from '../lib/supabase';

type AuthContextValue = {
  authPrompt: AuthPromptState | null;
  closeAuthPrompt: () => void;
  closeUsernamePrompt: () => void;
  error: string | null;
  hasCompletedUsernameSetup: boolean;
  isConfigured: boolean;
  isLoading: boolean;
  isProfileLoading: boolean;
  isSubmitting: boolean;
  notice: string | null;
  openUsernamePrompt: (options?: UsernamePromptOptions) => void;
  profile: Profile | null;
  requireAuth: (options: RequireAuthOptions) => boolean;
  saveUsername: (username: string) => Promise<void>;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  user: User | null;
  usernamePrompt: UsernamePromptState | null;
  usernameSetupRequired: boolean;
};

type RequireAuthOptions = {
  actionLabel: string;
  description?: string;
  onReady?: () => void;
};

type AuthPromptState = RequireAuthOptions;
type UsernamePromptOptions = {
  actionLabel?: string;
  description?: string;
  onReady?: () => void;
};
type UsernamePromptState = Required<Pick<UsernamePromptOptions, 'actionLabel' | 'description'>>;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedProfile, setHasLoadedProfile] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [authPrompt, setAuthPrompt] = useState<AuthPromptState | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [usernamePrompt, setUsernamePrompt] =
    useState<UsernamePromptState | null>(null);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const usernameSetupRequired = Boolean(
    session && hasLoadedProfile && needsUsernameSetup(profile),
  );
  const hasCompletedUsernameSetup = Boolean(session && !usernameSetupRequired);

  useEffect(() => {
    if (!supabase) {
      setError(supabaseConfigError);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!isMounted) {
          return;
        }
        if (sessionError) {
          setError(sessionError.message);
        }
        setSession(data.session);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session) {
      setAuthPrompt(null);
    } else {
      setProfile(null);
      setHasLoadedProfile(false);
      setUsernamePrompt(null);
      pendingActionRef.current = null;
    }
  }, [session]);

  useEffect(() => {
    if (!session) {
      return;
    }

    let isMounted = true;
    setHasLoadedProfile(false);
    setIsProfileLoading(true);

    getProfile(session.user.id)
      .then((nextProfile) => {
        if (isMounted) {
          setProfile(nextProfile);
        }
      })
      .catch((profileError) => {
        if (isMounted) {
          setError(
            profileError instanceof Error
              ? profileError.message
              : 'Unable to load profile.',
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setHasLoadedProfile(true);
          setIsProfileLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [session]);

  useEffect(() => {
    if (session && hasLoadedProfile && !isProfileLoading && needsUsernameSetup(profile)) {
      setUsernamePrompt({
        actionLabel: 'Choose username',
        description: 'Choose a public username before posting content.',
      });
    }
  }, [hasLoadedProfile, isProfileLoading, profile, session]);

  useEffect(() => {
    if (
      !session ||
      !hasLoadedProfile ||
      isProfileLoading ||
      needsUsernameSetup(profile)
    ) {
      return;
    }

    if (!pendingActionRef.current) {
      return;
    }

    const pendingAction = pendingActionRef.current;
    pendingActionRef.current = null;
    setUsernamePrompt(null);
    setAuthPrompt(null);
    pendingAction();
  }, [hasLoadedProfile, isProfileLoading, profile, session]);

  const closeAuthPrompt = useCallback(() => {
    setAuthPrompt(null);
  }, []);

  const closeUsernamePrompt = useCallback(() => {
    setUsernamePrompt(null);
  }, []);

  const openUsernamePrompt = useCallback((options?: UsernamePromptOptions) => {
    if (options?.onReady) {
      pendingActionRef.current = options.onReady;
    }

    setError(null);
    setNotice(null);
    setUsernamePrompt({
      actionLabel: options?.actionLabel ?? 'Choose username',
      description:
        options?.description ??
        'Choose a public username before posting content.',
    });
  }, []);

  const requireAuth = useCallback(
    (options: RequireAuthOptions) => {
      if (session) {
        if (!hasLoadedProfile || needsUsernameSetup(profile)) {
          openUsernamePrompt({
            actionLabel: options.actionLabel,
            description:
              'Choose a public username before continuing with this action.',
            onReady: options.onReady,
          });
          return false;
        }

        return true;
      }

      if (options.onReady) {
        pendingActionRef.current = options.onReady;
      }

      setError(null);
      setNotice(null);
      setAuthPrompt(options);
      return false;
    },
    [hasLoadedProfile, openUsernamePrompt, profile, session],
  );

  const saveUsername = useCallback(
    async (username: string) => {
      if (!session) {
        setError('Sign in before choosing a username.');
        return;
      }

      setError(null);
      setNotice(null);
      setIsSubmitting(true);

      try {
        const nextProfile = profile
          ? await updateProfileUsername({
              userId: session.user.id,
              username,
            })
          : await upsertProfile({
              display_name: username.trim(),
              id: session.user.id,
              username: username.trim(),
            });

        setProfile(nextProfile);
        setNotice('Username saved.');
        setUsernamePrompt(null);
      } catch (usernameError) {
        const message =
          usernameError instanceof Error ? usernameError.message : '';

        setError(
          message.toLowerCase().includes('duplicate') ||
            message.toLowerCase().includes('unique')
            ? 'That username is already taken.'
            : message
              ? message
            : 'Unable to save username.',
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [profile, session],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      setError(supabaseConfigError);
      return;
    }

    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
    }

    setIsSubmitting(false);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      setError(supabaseConfigError);
      return;
    }

    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
    } else if (!data.session) {
      setNotice('Account created. Check your email to confirm your address before signing in.');
    } else {
      setNotice('Account created and signed in.');
    }

    setIsSubmitting(false);
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) {
      setError(supabaseConfigError);
      return;
    }

    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      setError(signOutError.message);
    }

    setIsSubmitting(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      authPrompt,
      closeAuthPrompt,
      closeUsernamePrompt,
      error,
      hasCompletedUsernameSetup,
      isConfigured: hasSupabaseConfig,
      isLoading,
      isProfileLoading,
      isSubmitting,
      notice,
      openUsernamePrompt,
      profile,
      requireAuth,
      saveUsername,
      session,
      signIn,
      signOut,
      signUp,
      user: session?.user ?? null,
      usernamePrompt,
      usernameSetupRequired,
    }),
    [
      authPrompt,
      closeAuthPrompt,
      closeUsernamePrompt,
      error,
      hasCompletedUsernameSetup,
      isLoading,
      isProfileLoading,
      isSubmitting,
      notice,
      openUsernamePrompt,
      profile,
      requireAuth,
      saveUsername,
      session,
      signIn,
      signOut,
      signUp,
      usernamePrompt,
      usernameSetupRequired,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
