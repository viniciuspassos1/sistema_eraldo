import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, type Variants } from 'motion/react';
import { Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { redefinirSenha, AuthApiError } from '../api/auth';
import logoIcon from '../assets/logo-icon.png';

const stagger = (staggerChildren = 0.07, delayChildren = 0): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren, delayChildren } },
});

const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export function RedefinirSenha() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();

  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [concluido, setConcluido] = useState(false);

  const senhasDiferentes = confirmar.length > 0 && novaSenha !== confirmar;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro('');
    if (novaSenha.length < 8) {
      setErro('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (novaSenha !== confirmar) {
      setErro('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      await redefinirSenha(token, novaSenha);
      setConcluido(true);
      window.setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setErro(err instanceof AuthApiError ? err.message : 'Não foi possível redefinir a senha.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy p-6">
      <motion.div
        className="w-full max-w-sm bg-cream rounded-2xl p-8 sm:p-10"
        variants={stagger(0.07)}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={item} className="flex items-center gap-3 mb-1.5">
          <img src={logoIcon} alt="" className="h-9 w-9 object-contain shrink-0" />
          <h1 className="font-serif text-2xl text-navy">Redefinir senha</h1>
        </motion.div>

        {!token ? (
          <motion.div variants={item} className="mt-6">
            <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-4 py-3.5">
              Link inválido — abra o link enviado por e-mail de novo, ou peça um novo em "Esqueceu a senha?".
            </p>
            <Link
              to="/esqueci-senha"
              className="mt-6 inline-flex items-center gap-1.5 text-sm text-navy hover:text-navy-light transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Pedir novo link
            </Link>
          </motion.div>
        ) : concluido ? (
          <motion.div variants={item} className="mt-6">
            <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" strokeWidth={1.75} />
              <p className="text-sm text-emerald-900 leading-relaxed">
                Senha redefinida com sucesso! Levando você pro login...
              </p>
            </div>
          </motion.div>
        ) : (
          <>
            <motion.p variants={item} className="text-text-secondary text-sm mt-1.5 mb-8">
              Escolha uma senha nova pra sua conta.
            </motion.p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <motion.div variants={item}>
                <label htmlFor="novaSenha" className="block font-mono text-[10px] tracking-[0.15em] text-text-secondary mb-2">
                  NOVA SENHA
                </label>
                <div className="relative">
                  <input
                    id="novaSenha"
                    type={showSenha ? 'text' : 'password'}
                    required
                    minLength={8}
                    disabled={loading}
                    autoComplete="new-password"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
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
              </motion.div>

              <motion.div variants={item}>
                <label htmlFor="confirmar" className="block font-mono text-[10px] tracking-[0.15em] text-text-secondary mb-2">
                  CONFIRMAR SENHA
                </label>
                <input
                  id="confirmar"
                  type={showSenha ? 'text' : 'password'}
                  required
                  disabled={loading}
                  autoComplete="new-password"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  placeholder="Repita a senha"
                  className={`w-full bg-white border rounded-lg px-3.5 py-2.5 text-sm text-navy placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 transition-shadow duration-150 ${
                    senhasDiferentes ? 'border-rose-300 focus:ring-rose-200' : 'border-border focus:ring-gold/40 focus:border-gold/60'
                  }`}
                />
              </motion.div>

              {erro && (
                <motion.p
                  variants={item}
                  className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2"
                >
                  {erro}
                </motion.p>
              )}

              <motion.button
                variants={item}
                type="submit"
                disabled={loading}
                className="group w-full bg-navy text-white text-sm font-medium rounded-lg py-2.5 hover:bg-navy-light transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    REDEFINIR SENHA
                    <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" />
                  </>
                )}
              </motion.button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
