import { lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout';

// Login e Dashboard carregam de cara (é a primeira tela que a pessoa vê
// depois de autenticar). Todo o resto só entra no bundle quando a rota é
// visitada — reduz o JS inicial e mantém o app leve mesmo crescendo.
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';

const AssistenteIA = lazy(() => import('./pages/AssistenteIA').then((m) => ({ default: m.AssistenteIA })));
const Administracao = lazy(() => import('./pages/Administracao').then((m) => ({ default: m.Administracao })));
const AdministracaoUsuarios = lazy(() =>
  import('./pages/AdministracaoUsuarios').then((m) => ({ default: m.AdministracaoUsuarios }))
);
const Documentos = lazy(() => import('./pages/Documentos').then((m) => ({ default: m.Documentos })));
const CooperativaIdeias = lazy(() =>
  import('./pages/CooperativaIdeias').then((m) => ({ default: m.CooperativaIdeias }))
);
const Tribunais = lazy(() => import('./pages/Tribunais').then((m) => ({ default: m.Tribunais })));
const FuncionarioPerfil = lazy(() =>
  import('./pages/FuncionarioPerfil').then((m) => ({ default: m.FuncionarioPerfil }))
);
const CalendarioEscritorio = lazy(() =>
  import('./pages/CalendarioEscritorio').then((m) => ({ default: m.CalendarioEscritorio }))
);
const Solicitacoes = lazy(() => import('./pages/Solicitacoes').then((m) => ({ default: m.Solicitacoes })));
const Notificacoes = lazy(() => import('./pages/Notificacoes').then((m) => ({ default: m.Notificacoes })));
const BaseConhecimento = lazy(() =>
  import('./pages/BaseConhecimento').then((m) => ({ default: m.BaseConhecimento }))
);
const ManualInterno = lazy(() => import('./pages/ManualInterno').then((m) => ({ default: m.ManualInterno })));
const Perfil = lazy(() => import('./pages/Perfil').then((m) => ({ default: m.Perfil })));
const Configuracoes = lazy(() => import('./pages/Configuracoes').then((m) => ({ default: m.Configuracoes })));
const MeuAuthenticator = lazy(() =>
  import('./pages/MeuAuthenticator').then((m) => ({ default: m.MeuAuthenticator }))
);

function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <ToastProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route
              path="/assistente-ia"
              element={
                <ProtectedRoute pagina="assistente-ia">
                  <AssistenteIA />
                </ProtectedRoute>
              }
            />
            <Route
              path="/base-conhecimento"
              element={
                <ProtectedRoute pagina="base-conhecimento">
                  <BaseConhecimento />
                </ProtectedRoute>
              }
            />
            <Route path="/calendario" element={<CalendarioEscritorio />} />
            <Route path="/funcionarios/:id" element={<FuncionarioPerfil />} />
            <Route
              path="/manual"
              element={
                <ProtectedRoute pagina="manual">
                  <ManualInterno />
                </ProtectedRoute>
              }
            />
            <Route
              path="/documentos"
              element={
                <ProtectedRoute pagina="documentos">
                  <Documentos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cooperativa-ideias"
              element={
                <ProtectedRoute pagina="cooperativa-ideias">
                  <CooperativaIdeias />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tribunais"
              element={
                <ProtectedRoute pagina="tribunais">
                  <Tribunais />
                </ProtectedRoute>
              }
            />
            <Route
              path="/solicitacoes"
              element={
                <ProtectedRoute pagina="solicitacoes">
                  <Solicitacoes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notificacoes"
              element={
                <ProtectedRoute pagina="notificacoes">
                  <Notificacoes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/meu-authenticator"
              element={
                <ProtectedRoute pagina="meu-authenticator">
                  <MeuAuthenticator />
                </ProtectedRoute>
              }
            />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/configuracoes" element={<Configuracoes />} />

            <Route
              path="/administracao"
              element={
                <ProtectedRoute adminOnly>
                  <Administracao />
                </ProtectedRoute>
              }
            />
            <Route
              path="/administracao/usuarios"
              element={
                <ProtectedRoute adminOnly>
                  <AdministracaoUsuarios />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ToastProvider>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;
