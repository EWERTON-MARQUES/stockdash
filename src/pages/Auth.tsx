import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { z } from 'zod';
import { Lock, Mail, Shield, Sparkles, AlertTriangle } from 'lucide-react';

const authSchema = z.object({
  email: z.string().email('Email inválido').max(255, 'Email muito longo'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').max(128, 'Senha muito longa'),
});

// Rate limiting configuration
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const navigate = useNavigate();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/');
      }
    });

    // Check for stored lockout
    const storedLockout = sessionStorage.getItem('auth_lockout');
    if (storedLockout) {
      const lockoutTime = parseInt(storedLockout, 10);
      if (lockoutTime > Date.now()) {
        setLockedUntil(lockoutTime);
      } else {
        sessionStorage.removeItem('auth_lockout');
        sessionStorage.removeItem('auth_attempts');
      }
    }

    const storedAttempts = sessionStorage.getItem('auth_attempts');
    if (storedAttempts) {
      setAttempts(parseInt(storedAttempts, 10));
    }

    return () => {
      subscription.unsubscribe();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [navigate]);

  useEffect(() => {
    if (lockedUntil) {
      timerRef.current = setInterval(() => {
        const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
        if (remaining <= 0) {
          setLockedUntil(null);
          setAttempts(0);
          sessionStorage.removeItem('auth_lockout');
          sessionStorage.removeItem('auth_attempts');
          if (timerRef.current) clearInterval(timerRef.current);
        } else {
          setRemainingTime(remaining);
        }
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [lockedUntil]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if locked
    if (lockedUntil && lockedUntil > Date.now()) {
      toast.error('Muitas tentativas. Aguarde antes de tentar novamente.');
      return;
    }

    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    
    if (error) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      sessionStorage.setItem('auth_attempts', String(newAttempts));

      if (newAttempts >= MAX_ATTEMPTS) {
        const lockoutTime = Date.now() + LOCKOUT_DURATION;
        setLockedUntil(lockoutTime);
        sessionStorage.setItem('auth_lockout', String(lockoutTime));
        toast.error('Conta bloqueada temporariamente. Tente novamente em 15 minutos.');
      } else if (error.message.includes('Invalid login credentials')) {
        toast.error(`Credenciais inválidas. ${MAX_ATTEMPTS - newAttempts} tentativas restantes.`);
      } else {
        toast.error('Erro ao fazer login');
      }
    } else {
      sessionStorage.removeItem('auth_attempts');
      sessionStorage.removeItem('auth_lockout');
      toast.success('Bem-vindo!');
      navigate('/');
    }
    setLoading(false);
  };

  const isLocked = lockedUntil && lockedUntil > Date.now();

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-red-400/30 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Glow effect behind card */}
        <div className="absolute -inset-1 bg-gradient-to-r from-red-500/20 via-rose-500/20 to-red-500/20 rounded-2xl blur-xl opacity-70" />
        
        <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-rose-500 mb-4 shadow-lg shadow-red-500/25">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
              StockPro
              <Sparkles className="w-5 h-5 text-red-400" />
            </h1>
            <p className="text-slate-400 text-sm">Sistema de Gestão Avançado</p>
          </div>

          {/* Security badge */}
          <div className="flex items-center justify-center gap-2 mb-6 py-2 px-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span className="text-xs text-slate-400">Conexão Segura • SSL/TLS</span>
          </div>

          {/* Lockout warning */}
          {isLocked && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <p className="text-red-400 text-sm font-medium">Acesso bloqueado</p>
                <p className="text-red-400/70 text-xs">
                  Aguarde {Math.floor(remainingTime / 60)}:{String(remainingTime % 60).padStart(2, '0')} para tentar novamente
                </p>
              </div>
            </div>
          )}

          {/* Login form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300 text-sm font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLocked}
                  autoComplete="email"
                  className="pl-11 h-12 bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 focus:border-red-500/50 focus:ring-red-500/20 transition-all duration-200 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300 text-sm font-medium">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLocked}
                  autoComplete="current-password"
                  className="pl-11 h-12 bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 focus:border-red-500/50 focus:ring-red-500/20 transition-all duration-200 disabled:opacity-50"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold rounded-xl shadow-lg shadow-red-500/25 transition-all duration-300 hover:shadow-red-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100" 
              disabled={loading || isLocked}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Autenticando...</span>
                </div>
              ) : isLocked ? (
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Bloqueado
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Acessar Sistema
                </span>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-700/50">
            <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                <span>256-bit SSL</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-slate-600" />
              <span>Acesso Restrito</span>
              <div className="w-1 h-1 rounded-full bg-slate-600" />
              <span>v2.0</span>
            </div>
          </div>
        </div>

        {/* Bottom decoration */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent rounded-full blur-sm" />
      </div>
    </div>
  );
}
