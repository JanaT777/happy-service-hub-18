import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Headset, LogIn, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

const Login = () => {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (isSignUp) {
      const { error } = await signUp(email, password);
      if (error) {
        toast.error(error);
      } else {
        toast.success('Registrácia úspešná! Skontrolujte váš email pre potvrdenie.');
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error);
      }
    }

    setSubmitting(false);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-3">
              <Headset className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="font-heading text-2xl font-bold">ServiceDesk</h1>
          <p className="text-sm text-muted-foreground">
            {isSignUp ? 'Vytvorte si účet' : 'Prihláste sa do systému'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="vas@email.com" value={email}
              onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Heslo</Label>
            <Input id="password" type="password" placeholder="••••••••" value={password}
              onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>
          <Button type="submit" className="w-full gap-2" disabled={submitting}>
            {isSignUp ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            {isSignUp ? 'Registrovať' : 'Prihlásiť sa'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isSignUp ? 'Už máte účet?' : 'Nemáte účet?'}{' '}
          <button onClick={() => setIsSignUp(!isSignUp)} className="font-medium text-primary hover:underline">
            {isSignUp ? 'Prihlásiť sa' : 'Registrovať'}
          </button>
        </p>

        <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground text-center">
          Po registrácii vám administrátor pridelí rolu (CRM alebo CC Admin).
        </div>
      </div>
    </div>
  );
};

export default Login;
