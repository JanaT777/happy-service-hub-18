import { Navigate } from 'react-router-dom';
import { useAuth, type AppRole } from '@/hooks/use-auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: AppRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!role) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h2 className="font-heading text-xl font-bold mb-2">Čakáte na pridelenie role</h2>
        <p className="text-muted-foreground text-sm">
          Váš účet zatiaľ nemá pridelenú rolu. Kontaktujte administrátora.
        </p>
      </div>
    );
  }

  if (!allowedRoles.includes(role)) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h2 className="font-heading text-xl font-bold mb-2">Prístup zamietnutý</h2>
        <p className="text-muted-foreground text-sm">
          Nemáte oprávnenie na prístup k tejto sekcii.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
