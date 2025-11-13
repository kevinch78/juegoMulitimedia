import { useEffect, useRef, useState } from 'react'
import Experience from './Experience/Experience'
import './styles/loader.css'
import AuthForm from './components/AuthForm'
import { verify, getToken, logout } from './services/authService'

const App = () => {
  const canvasRef = useRef()
  const experienceRef = useRef(null)
  const [progress, setProgress] = useState(0)
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    // Ya no buscamos JWT previo: se debe iniciar sesión siempre
    setAuthed(false)
    setChecking(false)
  }, [])

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
  }, [authed])

  function handleLogout() {
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
  }

  if (checking) return <div style={{marginTop: 50, textAlign:'center'}}>Verificando acceso...</div>
  if (msg) return <div style={{marginTop: 60, textAlign:'center', fontSize: '1.1em'}}>{msg}</div>
  if (!authed) return <AuthForm onLogin={() => setAuthed(true)} />

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
