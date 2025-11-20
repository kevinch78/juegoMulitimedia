import { useEffect, useRef, useState, useCallback } from 'react'
import Experience from './Experience/Experience'
import './styles/loader.css'
import AuthForm from './components/AuthForm'
import { logout } from './services/authService'

const App = () => {
  const canvasRef = useRef()
  const experienceRef = useRef(null)
  const [progress, setProgress] = useState(0)
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [msg, setMsg] = useState('')

  // Detectar si hay backend configurado
  const hasBackend = import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL !== '';

  useEffect(() => {
    // Si no hay backend, iniciar directamente sin autenticación
    if (!hasBackend) {
      console.log('🎮 Modo sin backend: Iniciando juego directamente');
      setAuthed(true);
      setChecking(false);
    } else {
      // Con backend, requiere autenticación
      setAuthed(false);
      setChecking(false);
    }
  }, [hasBackend])

  const handleLogout = useCallback(() => {
    // Si no hay backend, no hay logout (simplemente recargar)
    if (!hasBackend) {
      window.location.reload();
      return;
    }
    
    // Destruir Experience y limpiar HUD antes de cerrar sesión
    if (experienceRef.current) {
      if (experienceRef.current.menu) {
        experienceRef.current.menu.destroy()
      }
      if (experienceRef.current.destroy) {
        experienceRef.current.destroy()
      }
      experienceRef.current = null
    }
    
    logout()
    setAuthed(false)
    setLoading(true) // Resetear loading para la próxima sesión
    setMsg('Sesión cerrada. ¡Vuelve pronto!')
    setTimeout(() => setMsg(''), 1800)
  }, [hasBackend])

  useEffect(() => {
    if(!authed) return
    const experience = new Experience(canvasRef.current)
    experienceRef.current = experience
    
    if (experience.menu) {
      experience.menu.onLogout = handleLogout // Refresca siempre la función
    }
    const handleProgress = (e) => setProgress(e.detail)
    const handleComplete = () => setLoading(false)
    window.addEventListener('resource-progress', handleProgress)
    window.addEventListener('resource-complete', handleComplete)
    return () => {
      window.removeEventListener('resource-progress', handleProgress)
      window.removeEventListener('resource-complete', handleComplete)
      if (experience && experience.destroy) {
        experience.destroy()
      }
    }
  }, [authed, handleLogout])

  if (checking) return <div style={{marginTop: 50, textAlign:'center'}}>Verificando acceso...</div>
  if (msg) return <div style={{marginTop: 60, textAlign:'center', fontSize: '1.1em'}}>{msg}</div>
  // Solo mostrar AuthForm si hay backend configurado
  if (!authed && hasBackend) return <AuthForm onLogin={() => setAuthed(true)} />

  return (
    <>
      {loading && (
        <div id="loader-overlay">
          <div id="loader-bar" style={{ width: `${progress}%` }}></div>
          <div id="loader-text">Cargando... {progress}%</div>
        </div>
      )}
      <canvas ref={canvasRef} className="webgl" />
    </>
  )
}

export default App
