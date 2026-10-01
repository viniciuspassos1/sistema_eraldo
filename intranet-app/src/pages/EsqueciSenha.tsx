import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion, type Variants } from 'motion/react';
import { ArrowRight, ArrowLeft, MailCheck } from 'lucide-react';
import { esqueciSenha, AuthApiError } from '../api/auth';
import logoIcon from '../assets/logo-icon.png';

const stagger = (staggerChildren = 0.07, delayChildren = 0): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren, delayChildren } },
});

const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export function EsqueciSenha() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [enviado, setEnviado] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setLoading(true);
    try {
      await esqueciSenha(email);
      // Sempre mostra sucesso, exista ou não o e-mail no sistema — o
      // backend já responde 204 nos dois casos, de propósito (ver
      // routers/auth.py), pra não revelar quais e-mails estão cadastrados.
      setEnviado(true);
    } catch (err) {
      setErro(err instanceof AuthApiError ? err.message : 'Não foi possível enviar o e-mail.');
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
          <h1 className="font-serif text-2xl text-navy">Esqueceu a senha?</h1>
        </motion.div>

        {enviado ? (
          <motion.div variants={item} className="mt-6">
            <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3.5">
              <MailCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" strokeWidth={1.75} />
              <p className="text-sm text-emerald-900 leading-relaxed">
                Se esse e-mail estiver cadastrado, você vai receber um link pra redefinir a senha em alguns minutos.
                Confira também a caixa de spam.
              </p>
            </div>
            <Link
              to="/login"
              className="mt-6 inline-flex items-center gap-1.5 text-sm text-navy hover:text-navy-light transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar pro login
            </Link>
          </motion.div>
        ) : (
          <>
            <motion.p variants={item} className="text-text-secondary text-sm mt-1.5 mb-8">
              Informe o e-mail da sua conta corporativa — vamos mandar um link pra você escolher uma senha nova.
            </motion.p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <motion.div variants={item}>
                <label htmlFor="email" className="block font-mono text-[10px] tracking-[0.15em] text-text-secondary mb-2">
                  E-MAIL
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  disabled={loading}
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@proferaldojunior.com.br"
                  className="w-full bg-white border border-border rounded-lg px-3.5 py-2.5 text-sm text-navy placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/60 transition-shadow duration-150"
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
                    ENVIAR LINK
                    <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" />
                  </>
                )}
              </motion.button>

              <motion.div variants={item} className="text-center">
                <Link to="/login" className="text-xs text-gold hover:underline">
                  Voltar pro login
                </Link>
              </motion.div>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
