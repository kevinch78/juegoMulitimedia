import { useState } from 'react';
import { login, register } from '../services/authService';

const AuthForm = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let resp;
      if (isLogin) {
        resp = await login({ email, password });
        if (resp.token) onLogin();
      } else {
        resp = await register({ username, email, password });
        if (resp.message && !resp.error) setIsLogin(true);
      }
      if (resp.message && resp.message.includes('incorrecta')) setError('Contraseña o usuario incorrectos');
      if (resp.message && resp.message.includes('ya registrado')) setError('Usuari@ ya existe');
    } catch {
      setError('Error de red');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
      backgroundSize: '400% 400%',
      animation: 'gradientShift 15s ease infinite',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif',
    }}>
      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px #ff00ff, 0 0 40px #00ffff, 0 8px 30px rgba(0,0,0,0.3); }
          50% { box-shadow: 0 0 30px #00ffff, 0 0 60px #ff00ff, 0 12px 40px rgba(0,0,0,0.4); }
        }
      `}</style>
      <div style={{
        maxWidth: 420,
        width: '90%',
        padding: 32,
        background: 'rgba(20, 20, 40, 0.85)',
        borderRadius: 24,
        boxShadow: '0 0 20px #ff00ff, 0 0 40px #00ffff, 0 8px 30px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(10px)',
        border: '2px solid rgba(255, 255, 255, 0.1)',
        animation: 'glow 3s ease-in-out infinite',
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: 30,
          animation: 'float 3s ease-in-out infinite',
        }}>
          <span role="img" aria-label="game" style={{
            fontSize: '64px',
            display: 'inline-block',
            filter: 'drop-shadow(0 0 10px #00ffff)',
          }}>
            🎮
          </span>
          <h1 style={{
            color: '#fff',
            fontSize: '32px',
            fontWeight: 800,
            margin: '16px 0 8px',
            textShadow: '0 0 20px #ff00ff, 0 0 30px #00ffff',
            letterSpacing: '2px',
          }}>
            K&Z
          </h1>
        </div>
        <h2 style={{
          textAlign: 'center',
          marginBottom: 24,
          color: '#00ffff',
          letterSpacing: '2px',
          fontSize: '22px',
          fontWeight: 700,
          textTransform: 'uppercase',
          textShadow: '0 0 10px #00ffff',
        }}>
          {isLogin ? '⭐ Iniciar Sesión' : '⭐ Registro'}
        </h2>
      <form onSubmit={handleSubmit} style={{marginBottom:16}}>
        {!isLogin && (
          <input
            type="text"
            placeholder="👤 Usuario"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            style={{
              display: 'block',
              marginBottom: 14,
              width: '100%',
              padding: '14px 16px',
              borderRadius: 12,
              border: '2px solid rgba(0, 255, 255, 0.3)',
              fontSize: 16,
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              outline: 'none',
              transition: 'all 0.3s',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => e.target.style.border = '2px solid #00ffff'}
            onBlur={(e) => e.target.style.border = '2px solid rgba(0, 255, 255, 0.3)'}
          />
        )}
        <input
          type="email"
          placeholder="📧 Correo electrónico"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{
            display: 'block',
            marginBottom: 14,
            width: '100%',
            padding: '14px 16px',
            borderRadius: 12,
            border: '2px solid rgba(0, 255, 255, 0.3)',
            fontSize: 16,
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
            outline: 'none',
            transition: 'all 0.3s',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => e.target.style.border = '2px solid #00ffff'}
          onBlur={(e) => e.target.style.border = '2px solid rgba(0, 255, 255, 0.3)'}
        />
        <input
          type="password"
          placeholder="🔒 Contraseña"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={{
            display: 'block',
            marginBottom: 20,
            width: '100%',
            padding: '14px 16px',
            borderRadius: 12,
            border: '2px solid rgba(0, 255, 255, 0.3)',
            fontSize: 16,
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
            outline: 'none',
            transition: 'all 0.3s',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => e.target.style.border = '2px solid #00ffff'}
          onBlur={(e) => e.target.style.border = '2px solid rgba(0, 255, 255, 0.3)'}
        />
        <button disabled={loading} style={{
          width: '100%',
          boxSizing: 'border-box',
          background: loading ? '#555' : 'linear-gradient(135deg, #ff00ff 0%, #00ffff 100%)',
          color: '#fff',
          border: 'none',
          borderRadius: 14,
          fontWeight: 800,
          fontSize: 18,
          padding: '15px 0',
          marginTop: 8,
          boxShadow: loading ? 'none' : '0 0 20px #ff00ff, 0 4px 15px rgba(0,0,0,0.3)',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s',
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)',
        }}
        onMouseEnter={(e) => !loading && (e.target.style.transform = 'scale(1.05)')}
        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}>
          {loading ? '⏳ Procesando...' : isLogin ? 'Entrar al Juego' : 'Crear Cuenta'}
        </button>
      </form>
      {error && (
        <div style={{
          color: '#ff6b6b',
          background: 'rgba(255, 107, 107, 0.15)',
          padding: 12,
          borderRadius: 10,
          textAlign: 'center',
          marginTop: 12,
          fontWeight: 600,
          border: '1px solid rgba(255, 107, 107, 0.3)',
          fontSize: 15,
        }}>
          ⚠️ {error}
        </div>
      )}
      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <button onClick={() => setIsLogin(!isLogin)} style={{
          background: 'none',
          color: '#00ffff',
          border: 'none',
          cursor: 'pointer',
          fontSize: 15,
          fontWeight: 500,
          padding: 0,
          textShadow: '0 0 10px #00ffff',
        }}
        onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
        onMouseLeave={(e) => e.target.style.textDecoration = 'none'}>
          {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </div>
      </div>
    </div>
  );
};

export default AuthForm;
