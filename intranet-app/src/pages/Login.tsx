import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Scale } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo-gold.webp';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [manterConectado, setManterConectado] = useState(false);
  const [showSenha, setShowSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setLoading(true);
    const result = await login(email, senha, manterConectado);
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
      <div className="hidden lg:flex flex-1 flex-col justify-between p-14 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />

        <img src={logo} alt="Eraldo Júnior Advocacia" className="relative h-11 w-auto object-contain object-left" />

        <div className="relative max-w-lg">
          <p className="font-mono text-[11px] tracking-[0.25em] text-gold/80 mb-6">PORTAL RESTRITO</p>
          <h1 className="font-serif text-4xl leading-[1.15] text-white">
            Dignidade, confiança e{' '}
            <span className="italic text-gold">respeito</span> em cada atendimento.
          </h1>
          <p className="text-white/55 text-sm mt-6 leading-relaxed">
            Acesso exclusivo para colaboradores e administradores do escritório Eraldo Júnior Advocacia.
          </p>

          <div className="mt-14 flex items-center gap-3 text-gold/70">
            <Scale className="w-7 h-7" strokeWidth={1.25} />
            <div className="h-px flex-1 bg-gold/20" />
          </div>
        </div>

        <div className="relative font-mono text-[11px] tracking-wide text-white/35">
          <span>© {new Date().getFullYear()} Eraldo Júnior Advocacia</span>
        </div>
      </div>

      {/* Formulário */}
      <div className="w-full lg:w-[460px] bg-cream flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <img src={logo} alt="Eraldo Júnior Advocacia" className="h-9 w-auto mb-10 lg:hidden" />

          <h2 className="font-serif text-2xl text-navy">Acessar intranet</h2>
          <p className="text-text-secondary text-sm mt-1.5 mb-9">
            Entre com suas credenciais corporativas.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block font-mono text-[10px] tracking-[0.15em] text-text-secondary mb-2">
                E-MAIL
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@proferaldojunior.com.br"
                className="w-full bg-white border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/60 transition-shadow duration-150"
              />
            </div>

            <div>
              <label htmlFor="senha" className="block font-mono text-[10px] tracking-[0.15em] text-text-secondary mb-2">
                SENHA
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
                  className="w-full bg-white border border-border rounded-lg px-3.5 py-2.5 pr-10 text-sm text-navy placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/60 transition-shadow duration-150"
                />
                <button
                  type="button"
                  onClick={() => setShowSenha((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-navy transition-colors"
                  aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={manterConectado}
                  onChange={(e) => setManterConectado(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-border text-navy focus:ring-gold/40 accent-navy"
                />
                Manter conectado
              </label>
              <a href="#" className="text-xs text-gold hover:underline">
                Esqueceu a senha?
              </a>
            </div>

            {erro && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group w-full bg-navy text-white text-sm font-medium rounded-lg py-2.5 hover:bg-navy-light transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  ENTRAR
                  <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
