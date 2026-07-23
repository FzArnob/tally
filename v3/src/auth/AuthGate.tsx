import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { LoginScreen } from './LoginScreen';
import styles from './auth.module.css';

/** Gates the app behind authentication: loader → login → app. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div className={styles.screen}>
        <span className={styles.spinner} />
      </div>
    );
  }
  if (status === 'unauthenticated') return <LoginScreen />;
  return <>{children}</>;
}
