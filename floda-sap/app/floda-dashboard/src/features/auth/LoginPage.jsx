import { useState } from 'react';
import { Layers, Lock, Mail, ArrowRight, AlertCircle, User, BadgeCheck, UserPlus, LogIn, Building2 } from 'lucide-react';
import { usePersonaStore, PERSONAS } from '../../store/personaStore';
import { Button } from '../../components/ui';
import { toast } from 'sonner';

export default function LoginPage() {
  const { login, register } = usePersonaStore();
  
  // Tabs: 'signin' | 'register'
  const [authMode, setAuthMode] = useState('signin');
  
  // Selected department filter
  const [selectedRole, setSelectedRole] = useState('AUTHORITY');
  
  // Form states - empty by default to prevent leaking credentials/identities
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  
  // Registration form states
  const [regFullName, setRegFullName] = useState('');
  const [regEmployeeId, setRegEmployeeId] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('AUTHORITY');
  const [regOrg, setRegOrg] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const currentPersona = PERSONAS.find(p => p.role === (authMode === 'register' ? regRole : selectedRole)) || PERSONAS[0];

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const isEmail = identifier.includes('@');
      const credentials = isEmail
        ? { email: identifier.trim(), password }
        : { employeeId: identifier.trim(), password };

      const user = await login(credentials);
      toast.success(`Welcome back, ${user.fullName} (${user.badge || user.role})`);
    } catch (err) {
      const msg = err.message || 'Invalid credentials or connection issue';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (!regEmployeeId.trim()) {
      setErrorMsg('Employee ID is required');
      setLoading(false);
      return;
    }
    if (!regFullName.trim()) {
      setErrorMsg('Full name is required');
      setLoading(false);
      return;
    }
    if (!regEmail.trim()) {
      setErrorMsg('Official email is required');
      setLoading(false);
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        employeeId: regEmployeeId.trim(),
        fullName: regFullName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        role: regRole,
        organization: regOrg.trim() || undefined
      };

      const newUser = await register(payload);
      toast.success(`Account registered successfully! Welcome to ${newUser.badge} Operations.`);
    } catch (err) {
      const msg = err.message || 'Registration failed';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-portal-wrapper">
      <div className="login-portal-card">
        {/* Header */}
        <div className="login-header-zone">
          <div className="login-brand-group">
            <div className="brand-badge">
              <Layers size={20} strokeWidth={2.4} />
            </div>
            <div className="brand-text">
              <div className="flex items-center gap-2">
                <span className="brand-name">FLODA</span>
                <span className="brand-tag">FEDERATED RESILIENCE</span>
              </div>
              <span className="text-xs text-secondary">Logistics Orchestration Control</span>
            </div>
          </div>

          {/* Mode Switcher: Sign In vs New Registration */}
          <div className="auth-mode-tabs">
            <button
              type="button"
              className={`auth-mode-tab ${authMode === 'signin' ? 'active' : ''}`}
              onClick={() => { setAuthMode('signin'); setErrorMsg(''); }}
            >
              <LogIn size={14} />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              className={`auth-mode-tab ${authMode === 'register' ? 'active' : ''}`}
              onClick={() => { setAuthMode('register'); setErrorMsg(''); }}
            >
              <UserPlus size={14} />
              <span>New Personnel Registration</span>
            </button>
          </div>
        </div>

        {/* 2-Column Department Chooser & Form */}
        <div className="login-body-grid">
          {/* Left Column: Department Selection */}
          <div className="login-department-column">
            <div className="login-column-header">
              <h3 className="card-title">Select Department</h3>
              <p className="text-xs text-secondary">Choose the organizational domain to authenticate into</p>
            </div>

            <div className="persona-selector-grid">
              {PERSONAS.map((p) => {
                const isSelected = selectedRole === p.role;

                return (
                  <button
                    key={p.role}
                    type="button"
                    className={`persona-select-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedRole(p.role);
                      if (authMode === 'register') setRegRole(p.role);
                      setErrorMsg('');
                    }}
                  >
                    <div className="persona-card-top">
                      <div className="flex items-center gap-2">
                        <span className="persona-avatar-sm" style={{ backgroundColor: p.color }}>
                          {p.badge.substring(0, 2)}
                        </span>
                        <div>
                          <strong className="persona-card-name">{p.department}</strong>
                          <small className="persona-card-role">{p.title}</small>
                        </div>
                      </div>
                      <span className="badge-tag-mini">
                        {p.badge}
                      </span>
                    </div>
                    <small className="persona-card-org">{p.org}</small>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Authentication or Registration Form */}
          <div className="login-form-column">
            {authMode === 'signin' ? (
              /* ================= SIGN IN FORM ================= */
              <>
                <div className="login-column-header">
                  <h3 className="card-title">Personnel Sign In</h3>
                  <p className="text-xs text-secondary">
                    Authenticate for <b>{currentPersona.department}</b> using your Employee ID or Email
                  </p>
                </div>

                <div className="active-dept-callout" style={{ borderLeftColor: currentPersona.color }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: currentPersona.color }}>
                        {currentPersona.department}
                      </span>
                      <div className="text-sm font-semibold text-primary mt-0.5">{currentPersona.title}</div>
                    </div>
                    <span className="persona-avatar" style={{ backgroundColor: currentPersona.color }}>
                      {currentPersona.badge.substring(0, 2)}
                    </span>
                  </div>
                  <p className="text-xs text-secondary mt-1.5 leading-relaxed">
                    {currentPersona.description}
                  </p>
                </div>

                <form onSubmit={handleLogin} className="login-form-inputs">
                  {errorMsg && (
                    <div className="login-error-alert">
                      <AlertCircle size={15} />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="input-group">
                    <label className="input-label" htmlFor="user-identifier">
                      Employee ID or Department Email
                    </label>
                    <div className="input-field-wrap">
                      <User size={15} className="input-field-icon" />
                      <input
                        id="user-identifier"
                        type="text"
                        required
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className="form-input login-field"
                        placeholder="e.g. EMP-AUTH-101 or authority@floda.local"
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label className="input-label" htmlFor="user-password">
                      Password
                    </label>
                    <div className="input-field-wrap">
                      <Lock size={15} className="input-field-icon" />
                      <input
                        id="user-password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="form-input login-field"
                        placeholder="Enter password"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={loading}
                    className="w-full mt-2"
                  >
                    {loading ? (
                      <span>Authenticating...</span>
                    ) : (
                      <>
                        <span>Sign In as {currentPersona.badge} Officer</span>
                        <ArrowRight size={15} />
                      </>
                    )}
                  </Button>
                </form>

                <div className="login-register-prompt">
                  <span>New to this operational domain?</span>
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => { setAuthMode('register'); setErrorMsg(''); setRegRole(selectedRole); }}
                  >
                    Register Employee Profile
                  </button>
                </div>
              </>
            ) : (
              /* ================= NEW USER REGISTRATION FORM ================= */
              <>
                <div className="login-column-header">
                  <h3 className="card-title">Register New Personnel</h3>
                  <p className="text-xs text-secondary">
                    Create an individual operational user profile under your assigned department
                  </p>
                </div>

                <form onSubmit={handleRegister} className="login-form-inputs">
                  {errorMsg && (
                    <div className="login-error-alert">
                      <AlertCircle size={15} />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="form-row-two">
                    <div className="input-group">
                      <label className="input-label" htmlFor="reg-emp-id">
                        Employee ID *
                      </label>
                      <div className="input-field-wrap">
                        <BadgeCheck size={15} className="input-field-icon" />
                        <input
                          id="reg-emp-id"
                          type="text"
                          required
                          value={regEmployeeId}
                          onChange={(e) => setRegEmployeeId(e.target.value)}
                          className="form-input login-field"
                          placeholder="e.g. EMP-LOG-808"
                        />
                      </div>
                    </div>

                    <div className="input-group">
                      <label className="input-label" htmlFor="reg-role">
                        Assigned Department *
                      </label>
                      <select
                        id="reg-role"
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value)}
                        className="form-select"
                      >
                        {PERSONAS.map(p => (
                          <option key={p.role} value={p.role}>
                            {p.badge} — {p.department}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="input-group">
                    <label className="input-label" htmlFor="reg-name">
                      Full Legal / Officer Name *
                    </label>
                    <div className="input-field-wrap">
                      <User size={15} className="input-field-icon" />
                      <input
                        id="reg-name"
                        type="text"
                        required
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        className="form-input login-field"
                        placeholder="e.g. Priya Sharma"
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label className="input-label" htmlFor="reg-email">
                      Official Department Email *
                    </label>
                    <div className="input-field-wrap">
                      <Mail size={15} className="input-field-icon" />
                      <input
                        id="reg-email"
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className="form-input login-field"
                        placeholder="priya.sharma@floda.local"
                      />
                    </div>
                  </div>

                  <div className="form-row-two">
                    <div className="input-group">
                      <label className="input-label" htmlFor="reg-password">
                        Security Password *
                      </label>
                      <div className="input-field-wrap">
                        <Lock size={15} className="input-field-icon" />
                        <input
                          id="reg-password"
                          type="password"
                          required
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="form-input login-field"
                          placeholder="Min 6 characters"
                        />
                      </div>
                    </div>

                    <div className="input-group">
                      <label className="input-label" htmlFor="reg-org">
                        Agency / Organization
                      </label>
                      <div className="input-field-wrap">
                        <Building2 size={15} className="input-field-icon" />
                        <input
                          id="reg-org"
                          type="text"
                          value={regOrg}
                          onChange={(e) => setRegOrg(e.target.value)}
                          className="form-input login-field"
                          placeholder={currentPersona.org}
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={loading}
                    className="w-full mt-2"
                  >
                    {loading ? (
                      <span>Registering Profile...</span>
                    ) : (
                      <>
                        <UserPlus size={15} />
                        <span>Complete Registration & Sign In</span>
                      </>
                    )}
                  </Button>
                </form>

                <div className="login-register-prompt">
                  <span>Already have an employee account?</span>
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => { setAuthMode('signin'); setErrorMsg(''); }}
                  >
                    Back to Sign In
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
