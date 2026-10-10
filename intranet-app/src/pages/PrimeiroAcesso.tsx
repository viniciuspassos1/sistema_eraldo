import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, type Variants } from 'motion/react';
import { Eye, EyeOff, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { trocarSenha, AuthApiError } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import logoIcon from '../assets/logo-icon.png';

const stagger = (staggerChildren = 0.07, delayChildren = 0): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren, delayChildren } },
});

const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

/** Tela obrigatória de primeiro acesso: aparece sempre que a conta ainda
 * está com a senha padrão definida pelo admin (user.trocaSenhaObrigatoria,
 * ver ProtectedRoute.tsx, que redireciona pra cá e bloqueia qualquer outra
 * página até essa troca acontecer). Reaproveita POST /api/auth/trocar-senha
 * — o mesmo endpoint da troca de senha em Configuracoes — que já zera o
 * flag `senha_temporaria` no backend e invalida o token atual. Por isso,
 * depois do sucesso, a sessão atual já não serve mais: a pessoa é levada
 * de volta pro login pra entrar de novo com a senha nova. */
export function PrimeiroAcesso() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [senhaAtual, setSenhaAtual] = useState('');
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
    if (novaSenha === senhaAtual) {
      setErro('A nova senha precisa ser diferente da senha atual.');
      return;
    }

    setLoading(true);
    try {
      await trocarSenha(senhaAtual, novaSenha);
      setConcluido(true);
      // trocar-senha já invalida o token atual no backend — a sessão em
      // memória não serve mais, então desloga de vez e manda pro login.
      window.setTimeout(() => {
        logout();
        navigate('/login', { replace: true });
      }, 2500);
    } catch (err) {
      setErro(err instanceof AuthApiError ? err.message : 'Não foi possível trocar a senha.');
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
          <h1 className="font-serif text-2xl text-navy">Defina sua senha</h1>
        </motion.div>

        {concluido ? (
          <motion.div variants={item} className="mt-6">
            <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" strokeWidth={1.75} />
              <p className="text-sm text-emerald-900 leading-relaxed">
                Senha definida com sucesso! Faça login de novo com a senha nova.
              </p>
            </div>
          </motion.div>
        ) : (
          <>
            <motion.div variants={item} className="flex items-start gap-2.5 bg-gold/10 border border-gold/25 rounded-lg px-4 py-3.5 mt-6 mb-7">
              <ShieldAlert className="w-4 h-4 text-[#8a6d34] shrink-0 mt-0.5" strokeWidth={1.75} />
              <p className="text-xs text-navy/80 leading-relaxed">
                Por segurança, antes de continuar você precisa trocar a senha padrão por uma senha só sua.
              </p>
            </motion.div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <motion.div variants={item}>
                <label htmlFor="senhaAtual" className="block font-mono text-[10px] tracking-[0.15em] text-text-secondary mb-2">
                  SENHA ATUAL
                </label>
                <input
                  id="senhaAtual"
                  type="password"
                  required
                  disabled={loading}
                  autoComplete="current-password"
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  className="w-full bg-white border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/60 transition-shadow duration-150"
                />
              </motion.div>

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
                  CONFIRMAR NOVA SENHA
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
                    SALVAR E CONTINUAR
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
