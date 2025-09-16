import { Navigate } from 'react-router-dom'
import { useAuth } from '../ctx/AuthContext'

export default function Protected({ roles = [], children }){
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (roles.length && !roles.includes(user.idRol)) return <Navigate to="/" replace />
  return children
}

