import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout';

import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { AssistenteIA } from './pages/AssistenteIA';
import { Administracao } from './pages/Administracao';
import { AdministracaoUsuarios } from './pages/AdministracaoUsuarios';
import { Audiencias } from './pages/Audiencias';
import { Documentos } from './pages/Documentos';
import { Tribunais } from './pages/Tribunais';
import { Funcionarios } from './pages/Funcionarios';
import { FuncionarioPerfil } from './pages/FuncionarioPerfil';
import { Ferias } from './pages/Ferias';
import { Agenda } from './pages/Agenda';
import { Aniversarios } from './pages/Aniversarios';
import { Avisos } from './pages/Avisos';
import { Feriados } from './pages/Feriados';
import { Solicitacoes } from './pages/Solicitacoes';
import { Notificacoes } from './pages/Notificacoes';
import { BaseConhecimento } from './pages/BaseConhecimento';
import { ManualInterno } from './pages/ManualInterno';
import { Onboarding } from './pages/Onboarding';
import { Perfil } from './pages/Perfil';
import { Configuracoes } from './pages/Configuracoes';

function App() {
  return (
    <HashRouter>
      <AuthProvider>
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
            <Route path="/assistente-ia" element={<AssistenteIA />} />
            <Route path="/base-conhecimento" element={<BaseConhecimento />} />
            <Route path="/audiencias" element={<Audiencias />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/ferias" element={<Ferias />} />
            <Route path="/aniversarios" element={<Aniversarios />} />
            <Route path="/avisos" element={<Avisos />} />
            <Route path="/feriados" element={<Feriados />} />
            <Route path="/funcionarios" element={<Funcionarios />} />
            <Route path="/funcionarios/:id" element={<FuncionarioPerfil />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/manual" element={<ManualInterno />} />
            <Route path="/documentos" element={<Documentos />} />
            <Route path="/tribunais" element={<Tribunais />} />
            <Route path="/solicitacoes" element={<Solicitacoes />} />
            <Route path="/notificacoes" element={<Notificacoes />} />
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
      </AuthProvider>
    </HashRouter>
  );
}

export default App;
