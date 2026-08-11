import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setLoading(true);
    const result = await login(email, senha);
    setLoading(false);
    if (result.ok) {
      navigate('/');
    } else {
      setErro(result.erro ?? 'Não foi possível entrar.');
    }
  }

  return (
    <div className="min-h-screen flex bg-navy">
      {/* Painel institucional */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="relative">
          <p className="text-white text-lg font-semibold tracking-wide">ERALDO JÚNIOR</p>
          <p className="text-gold text-xs tracking-[0.3em]">ADVOCACIA</p>
        </div>
        <div className="relative max-w-md">
          <div className="w-10 h-px bg-gold mb-6" />
          <p className="text-white text-2xl font-light leading-snug">
            Centralizando o conhecimento e a rotina do escritório em um só lugar.
          </p>
          <p className="text-white/50 text-sm mt-4">Intranet corporativa — acesso restrito a colaboradores.</p>
        </div>
        <p className="relative text-white/30 text-xs">
          © {new Date().getFullYear()} Eraldo Júnior Advocacia. Todos os direitos reservados.
        </p>
      </div>

      {/* Formulário */}
      <div className="w-full lg:w-[460px] bg-cream flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 text-center lg:text-left">
            <p className="text-navy text-xl font-semibold tracking-wide">ERALDO JÚNIOR</p>
            <p className="text-gold text-[11px] tracking-[0.3em]">ADVOCACIA</p>
          </div>

          <h1 className="text-navy text-lg font-semibold mb-1">Acessar intranet</h1>
          <p className="text-text-secondary text-sm mb-8">Entre com suas credenciais corporativas.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-navy mb-1.5">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@proferaldojunior.com.br"
                className="w-full bg-white border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy placeholder:text-text-secondary/70 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/60"
              />
            </div>

            <div>
              <label htmlFor="senha" className="block text-xs font-medium text-navy mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  id="senha"
                  type={showSenha ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border border-border rounded-lg px-3.5 py-2.5 pr-10 text-sm text-navy placeholder:text-text-secondary/70 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/60"
                />
                <button
                  type="button"
                  onClick={() => setShowSenha((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-navy"
                  aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {erro && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-navy text-white text-sm font-medium rounded-lg py-2.5 mt-2 hover:bg-navy-light transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              ENTRAR
            </button>

            <div className="text-center pt-1">
              <a href="#" className="text-xs text-gold hover:underline">
                Esqueci minha senha
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
