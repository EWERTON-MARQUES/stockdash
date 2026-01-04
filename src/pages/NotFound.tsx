import { useEffect, useState } from "react";
import { useLocation, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Shield } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // If not authenticated, redirect to auth page
  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 mb-6 shadow-lg shadow-blue-500/25">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-6xl font-bold mb-4 text-white">404</h1>
        <p className="text-xl text-slate-400 mb-6">Página não encontrada</p>
        <a 
          href="/" 
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300"
        >
          Voltar ao Dashboard
        </a>
      </div>
    </div>
  );
};

export default NotFound;