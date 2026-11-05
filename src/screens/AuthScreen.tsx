import React, { useState } from 'react';
import { ScreenType, UserProfile } from '../types.ts';

interface AuthScreenProps {
  onLogin: (user: UserProfile) => void;
  onNavigate: (screen: ScreenType) => void;
  showToast: (msg: string, icon?: string) => void;
  initialMode?: 'login' | 'register';
}

const DEMO_USERS: UserProfile[] = [
  {
    id: 'user-01',
    name: 'Graziela Félix',
    email: 'grazielafelix.manager@gmail.com',
    role: 'Product Manager & Requirements Lead',
    company: 'Banco Digital Corp',
  },
  {
    id: 'user-02',
    name: 'Carlos Eduardo',
    email: 'carlos.eduardo@reqscriba.dev',
    role: 'Tech Lead & Arquiteto de Software',
    company: 'Fintech Solutions',
  },
  {
    id: 'user-03',
    name: 'Mariana Silva',
    email: 'mariana.silva@reqscriba.dev',
    role: 'Analista de Qualidade & QA Lead',
    company: 'ReqScriba Labs',
  },
];

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLogin,
  onNavigate,
  showToast,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [isLoading, setIsLoading] = useState(false);

  // Login form state
  const [email, setEmail] = useState('grazielafelix.manager@gmail.com');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRole, setRegRole] = useState('Product Manager / PO');
  const [regCompany, setRegCompany] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Password Recovery modal
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Calculate password strength
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { label: 'Vazia', score: 0, color: 'bg-outline-variant/40' };
    if (pwd.length < 6) return { label: 'Fraca', score: 1, color: 'bg-error' };
    if (pwd.length < 10) return { label: 'Média', score: 2, color: 'bg-[#d97706]' };
    return { label: 'Forte', score: 3, color: 'bg-tertiary' };
  };

  const pwdStrength = getPasswordStrength(regPassword);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      showToast('Por favor, informe seu e-mail.', 'warning');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const matched = DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
      const userToLogin: UserProfile = matched || {
        id: `user-${Date.now()}`,
        name: email.split('@')[0].replace('.', ' '),
        email: email.trim(),
        role: 'Product Manager & Requirements Lead',
        company: 'Empresa do Usuário',
      };

      onLogin(userToLogin);
      showToast(`Bem-vindo(a) de volta, ${userToLogin.name}!`, 'check_circle');
    }, 600);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim()) {
      showToast('Preencha seu nome e e-mail corporativo.', 'warning');
      return;
    }
    if (regPassword.length < 6) {
      showToast('A senha precisa ter no mínimo 6 caracteres.', 'warning');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      showToast('As senhas não coincidem.', 'error');
      return;
    }
    if (!agreeTerms) {
      showToast('Você deve aceitar os termos de uso para continuar.', 'warning');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const newUser: UserProfile = {
        id: `user-${Date.now()}`,
        name: regName.trim(),
        email: regEmail.trim(),
        role: regRole,
        company: regCompany.trim() || 'Empresa Padrão',
      };

      onLogin(newUser);
      showToast(`Conta criada com sucesso! Bem-vindo(a), ${newUser.name}!`, 'celebration');
    }, 700);
  };

  const handleSelectDemoUser = (user: UserProfile) => {
    setEmail(user.email);
    setPassword('••••••••••••');
    onLogin(user);
    showToast(`Conectado como ${user.name} (${user.role})`, 'check_circle');
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotSent(true);
    setTimeout(() => {
      showToast(`E-mail de recuperação enviado para ${forgotEmail}!`, 'mark_email_read');
      setTimeout(() => {
        setForgotModalOpen(false);
        setForgotSent(false);
        setForgotEmail('');
      }, 1500);
    }, 600);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-surface">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl border border-outline-variant/30 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
        {/* Left Brand Panel (Desktop 5 cols) */}
        <div className="lg:col-span-5 bg-[#1b2838] p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Subtle decorative circles */}
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-primary/20 blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-tertiary/15 blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-md">
                <span className="material-symbols-outlined text-[26px]">history_edu</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">ReqScriba</h1>
                <span className="text-xs text-primary-fixed font-medium">Engenharia de Requisitos &amp; IA</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <h2 className="text-lg font-bold text-white leading-snug">
                User Stories claras, sem ambiguidades e prontas para o Sprint.
              </h2>
              <p className="text-xs text-white/70 leading-relaxed">
                Transforme gravações de reuniões e documentos técnicos em tarefas ágeis com conformidade às heurísticas QUS e norma ISO/IEC/IEEE 29148.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="flex flex-col gap-4 pt-4 border-t border-white/10">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-primary-fixed mt-0.5">
                  <span className="material-symbols-outlined text-[18px]">graphic_eq</span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Ingestão de Áudios &amp; PDFs</h3>
                  <p className="text-[11px] text-white/70 leading-relaxed">
                    Extraia requisitos de conversas gravadas com transcrição precisa e saltos temporais diretos.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-tertiary mt-0.5">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">13 Heurísticas QUS &amp; Critérios Gherkin</h3>
                  <p className="text-[11px] text-white/70 leading-relaxed">
                    Auditoria inteligente que identifica termos vagos e gera regras de teste automatizáveis.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-[#f59e0b] mt-0.5">
                  <span className="material-symbols-outlined text-[18px]">quiz</span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Perguntas de Follow-up</h3>
                  <p className="text-[11px] text-white/70 leading-relaxed">
                    Detecta lacunas de informação e gera roteiros objetivos para os stakeholders do projeto.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-6 mt-6 border-t border-white/10 flex items-center justify-between text-[11px] text-white/60">
            <span>ISO/IEC/IEEE 29148:2018</span>
            <span>Versão 2.4 Enterprise</span>
          </div>
        </div>

        {/* Right Form Panel (Desktop 7 cols) */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between">
          <div className="flex flex-col gap-6">
            {/* Tab Switcher */}
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mode === 'login'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  }`}
                >
                  Entrar na Conta
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mode === 'register'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  }`}
                >
                  Criar Nova Conta
                </button>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="text-xs text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
                title="Voltar aos projetos sem autenticar"
              >
                <span>Acessar Projetos</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>

            {/* TAB 1: LOGIN FORM */}
            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4 animate-in fade-in duration-200">
                <div>
                  <h3 className="text-xl font-bold text-on-surface">Acesse seu espaço de trabalho</h3>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Insira suas credenciais corporativas para visualizar e auditar o backlog de requisitos.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-on-surface flex items-center justify-between" htmlFor="login-email">
                    <span>E-mail Corporativo</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                      mail
                    </span>
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu.nome@empresa.com"
                      required
                      autoFocus
                      className="w-full pl-9 pr-3.5 py-2.5 bg-surface text-on-surface rounded-lg text-xs border border-outline-variant/30 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 shadow-xs transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-on-surface" htmlFor="login-password">
                      Senha
                    </label>
                    <button
                      type="button"
                      onClick={() => setForgotModalOpen(true)}
                      className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                      lock
                    </span>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Sua senha secreta..."
                      required
                      className="w-full pl-9 pr-10 py-2.5 bg-surface text-on-surface rounded-lg text-xs border border-outline-variant/30 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 shadow-xs transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface p-0.5 cursor-pointer"
                      title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary/20 cursor-pointer"
                    />
                    <span className="text-xs text-on-surface-variant font-medium">Lembrar-me neste navegador</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-primary hover:bg-primary-container text-white text-xs font-semibold rounded-lg shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-2"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Validando credenciais...</span>
                    </>
                  ) : (
                    <>
                      <span>Entrar no ReqScriba</span>
                      <span className="material-symbols-outlined text-[16px]">login</span>
                    </>
                  )}
                </button>

                {/* Quick Access Demo Profiles */}
                <div className="pt-4 border-t border-outline-variant/20 flex flex-col gap-2">
                  <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                    Acesso Rápido para Demonstração:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {DEMO_USERS.map((usr) => (
                      <button
                        key={usr.id}
                        type="button"
                        onClick={() => handleSelectDemoUser(usr)}
                        className="p-2.5 rounded-lg bg-surface hover:bg-surface-container border border-outline-variant/30 text-left transition-all flex flex-col cursor-pointer group"
                      >
                        <span className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                          {usr.name}
                        </span>
                        <span className="text-[10px] text-on-surface-variant truncate">{usr.role.split('&')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            )}

            {/* TAB 2: REGISTER FORM */}
            {mode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-3.5 animate-in fade-in duration-200">
                <div>
                  <h3 className="text-xl font-bold text-on-surface">Criar sua conta no ReqScriba</h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Comece a estruturar tarefas e requisitos com auditoria automática da IA.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-on-surface" htmlFor="reg-name">
                      Nome Completo
                    </label>
                    <input
                      id="reg-name"
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Ex: Graziela Félix"
                      required
                      autoFocus
                      className="w-full px-3 py-2 bg-surface text-on-surface rounded-lg text-xs border border-outline-variant/30 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 shadow-xs"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-on-surface" htmlFor="reg-email">
                      E-mail Corporativo
                    </label>
                    <input
                      id="reg-email"
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="seu.email@empresa.com"
                      required
                      className="w-full px-3 py-2 bg-surface text-on-surface rounded-lg text-xs border border-outline-variant/30 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 shadow-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-on-surface" htmlFor="reg-role">
                      Função Principal
                    </label>
                    <select
                      id="reg-role"
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value)}
                      className="w-full px-3 py-2 bg-surface text-on-surface rounded-lg text-xs border border-outline-variant/30 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 shadow-xs cursor-pointer"
                    >
                      <option value="Product Manager / PO">Product Manager / PO</option>
                      <option value="Tech Lead / Arquiteto">Tech Lead / Arquiteto</option>
                      <option value="Engenheiro de Software">Engenheiro de Software</option>
                      <option value="Analista de Qualidade / QA">Analista de Qualidade / QA</option>
                      <option value="Scrum Master / Agile Coach">Scrum Master / Agile Coach</option>
                      <option value="Designer de Produto / UX">Designer de Produto / UX</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-on-surface" htmlFor="reg-company">
                      Empresa / Organização
                    </label>
                    <input
                      id="reg-company"
                      type="text"
                      value={regCompany}
                      onChange={(e) => setRegCompany(e.target.value)}
                      placeholder="Ex: Banco Digital Corp"
                      className="w-full px-3 py-2 bg-surface text-on-surface rounded-lg text-xs border border-outline-variant/30 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 shadow-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-on-surface" htmlFor="reg-password">
                        Senha
                      </label>
                      {regPassword && (
                        <span className="text-[10px] text-on-surface-variant font-medium">
                          {pwdStrength.label}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        id="reg-password"
                        type={showRegPassword ? 'text' : 'password'}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres..."
                        required
                        className="w-full pl-3 pr-8 py-2 bg-surface text-on-surface rounded-lg text-xs border border-outline-variant/30 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface p-0.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {showRegPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-on-surface" htmlFor="reg-confirm">
                      Confirmar Senha
                    </label>
                    <input
                      id="reg-confirm"
                      type={showRegPassword ? 'text' : 'password'}
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Repita a senha..."
                      required
                      className="w-full px-3 py-2 bg-surface text-on-surface rounded-lg text-xs border border-outline-variant/30 focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 shadow-xs"
                    />
                  </div>
                </div>

                {/* Password strength bar */}
                {regPassword && (
                  <div className="flex items-center gap-1.5 h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${pwdStrength.color}`}
                      style={{ width: `${(pwdStrength.score / 3) * 100}%` }}
                    ></div>
                  </div>
                )}

                <label className="flex items-start gap-2 cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    required
                    className="w-4 h-4 rounded text-primary focus:ring-primary/20 cursor-pointer mt-0.5"
                  />
                  <span className="text-xs text-on-surface-variant leading-relaxed">
                    Li e concordo com os Termos de Uso e com a auditoria conforme a norma ISO/IEC/IEEE 29148:2018.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-primary hover:bg-primary-container text-white text-xs font-semibold rounded-lg shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-1"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Criando sua conta...</span>
                    </>
                  ) : (
                    <>
                      <span>Criar Minha Conta no ReqScriba</span>
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Footer note */}
          <div className="pt-6 border-t border-outline-variant/20 flex flex-wrap items-center justify-between text-[11px] text-on-surface-variant gap-2 mt-4">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-tertiary">lock</span>
              Ambiente Seguro e Protegido
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => showToast('Termos de Uso: Todos os dados permanecem confidenciais.')}
                className="hover:underline hover:text-primary cursor-pointer"
              >
                Termos de Uso
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => showToast('Privacidade: Criptografia de ponta a ponta.')}
                className="hover:underline hover:text-primary cursor-pointer"
              >
                Privacidade
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Recuperação de Senha */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#213145]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 border border-outline-variant/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined text-[24px]">lock_reset</span>
                <h3 className="text-base font-bold text-on-surface">Recuperar Senha</h3>
              </div>
              <button
                type="button"
                onClick={() => setForgotModalOpen(false)}
                className="p-1 rounded text-outline hover:text-on-surface transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Informe seu e-mail corporativo cadastrado. Enviaremos um link seguro para você redefinir sua senha de acesso.
            </p>

            <form onSubmit={handleForgotSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface" htmlFor="forgot-email">
                  E-mail Cadastrado
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="seu.email@empresa.com"
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-surface rounded-lg text-xs text-on-surface focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 border border-outline-variant/30 shadow-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={forgotSent}
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  <span>{forgotSent ? 'Enviando...' : 'Enviar Link de Redefinição'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
