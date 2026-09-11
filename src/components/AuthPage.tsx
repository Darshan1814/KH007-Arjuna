import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { Sparkles, ArrowRight, Loader2, ShieldCheck, GraduationCap, Briefcase } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAppStore } from '@/lib/store'

export default function AuthPage() {
  const { setUser, updateProfile, setOnboarded } = useAppStore()
  const [role, setRole] = useState<'student' | 'expert' | 'admin'>('student')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [specialization, setSpecialization] = useState('')
  const [name, setName] = useState('')
  
  const supabase = createClient()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    

    try {
      if (isLogin) {
        // Intercept the Mock Admin credentials and secretly use the REAL Admin Database Account!
        let loginEmail = email
        let loginPassword = password
        if (role === 'admin' && email === 'Admin' && password === 'admin123') {
          loginEmail = 'admin@gradpilot.local'
          loginPassword = 'adminpassword123'
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: loginPassword,
        })
        if (error) throw error
        
        // Healing Logic: If they log in via the Agent tab, ensure the database explicitly knows they are an expert
        // This fixes older accounts that were created before the database race-condition was patched
        if (role === 'expert' && data.user) {
          await supabase.from('profiles')
            .update({ role: 'expert', is_onboarded: true })
            .eq('id', data.user.id)
        }
        
        // Aggressively update local store based on the login tab selected to avoid Onboarding flash
        updateProfile({ role: role === 'admin' ? 'student' : role, isOnboarded: role === 'expert' })
        
        toast.success('Welcome back to EduFinAI!')
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error

        // If signup is successful, insert the profile with the selected role
        if (data.user) {
          // If Supabase didn't return a session (due to email confirm settings), force sign in!
          // Since our SQL trigger auto-confirms, this will succeed and give us the JWT needed for RLS.
          if (!data.session) {
            const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
            if (signInError) throw signInError
          }

          // Supabase background triggers can take a moment to create the profile row.
          // We will retry the update up to 5 times to prevent race conditions.
          let updateSuccess = false;
          let retries = 0;
          
          let lastUpdateError: any = null;
          
          while (!updateSuccess && retries < 5) {
            const { data: updatedRows, error: updateError } = await supabase.from('profiles')
              .update({
                role: role === 'admin' ? 'student' : role, // don't allow real admin signup
                name: role === 'expert' ? name : null,
                is_onboarded: role === 'expert', // experts don't need the 9-step student onboarding
                expert_specializations: role === 'expert' && specialization ? [specialization] : []
              })
              .eq('id', data.user.id)
              .select() // Force returning data to check if rows were actually affected
            
            if (!updateError && updatedRows && updatedRows.length > 0) {
              updateSuccess = true;
            } else {
              lastUpdateError = updateError;
              retries++;
              await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms before retry
            }
          }

          if (!updateSuccess) {
            console.error('Failed to update profile role after 5 retries. Trigger race condition likely.', lastUpdateError)
            toast.error('Failed to fully initialize profile. Please sign in again.')
          }

          updateProfile({ id: data.user.id, role: role === 'admin' ? 'student' : role, isOnboarded: role === 'expert' })
        }

        toast.success('Account created successfully! Check your email to confirm.')
      }
    } catch (err: any) {
      if (err.message?.includes('Email not confirmed')) {
        setError('Email not confirmed. Please check your inbox or disable "Confirm Email" in Supabase Auth settings.')
      } else if (err.message?.toLowerCase().includes('rate limit')) {
        setError('Supabase Rate Limit Hit: Please go to Supabase Dashboard -> Authentication -> Rate Limits and increase the "Signups rate limit".')
      } else {
        setError(err.message || 'An error occurred during authentication')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-grid z-0" />
      <div 
        className="glow-orb bg-primary"
        style={{ top: '20%', left: '10%', width: '300px', height: '300px' }}
      />
      <div 
        className="glow-orb bg-secondary"
        style={{ bottom: '10%', right: '10%', width: '400px', height: '400px' }}
      />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center bg-surface border border-border shadow-md text-primary mb-6 animate-pulse-glow">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground tracking-tight">
          {isLogin ? 'Welcome back' : 'Start your journey'}
        </h2>
        <p className="mt-2 text-center text-sm text-foreground-secondary">
          {role === 'student' && 'Your AI-powered study abroad copilot'}
          {role === 'expert' && 'Join our global network of verified advisors'}
          {role === 'admin' && 'GradPilot Administration Console'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass py-8 px-4 shadow-xl sm:rounded-xl sm:px-10"
        >
          <form className="space-y-6" onSubmit={handleAuth}>
            
            {/* Role Selection */}
            <div className="flex bg-black/20 p-1 rounded-xl mb-6 border border-white/5">
              <button 
                type="button" onClick={() => setRole('student')}
                className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 ${role === 'student' ? 'bg-primary text-white shadow-md' : 'text-foreground-muted hover:text-foreground'}`}
              >
                <GraduationCap className="w-3.5 h-3.5" /> Student
              </button>
              <button 
                type="button" onClick={() => setRole('expert')}
                className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 ${role === 'expert' ? 'bg-indigo-500 text-white shadow-md' : 'text-foreground-muted hover:text-foreground'}`}
              >
                <Briefcase className="w-3.5 h-3.5" /> Agent
              </button>
              <button 
                type="button" onClick={() => setRole('admin')}
                className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 ${role === 'admin' ? 'bg-red-500 text-white shadow-md' : 'text-foreground-muted hover:text-foreground'}`}
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Admin
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-md bg-danger/10 border border-danger/20 text-danger text-sm">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-foreground-secondary">
                {role === 'admin' ? 'Admin Username' : 'Email address'}
              </label>
              <div className="mt-1">
                <input
                  type={role === 'admin' ? 'text' : 'email'}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder={role === 'admin' ? 'Admin' : 'you@example.com'}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground-secondary">
                Password
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {!isLogin && role === 'expert' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary">
                    Full Name
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input-field"
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground-secondary">
                    Primary Specialization
                  </label>
                  <div className="mt-1">
                  <select 
                    className="input-field" 
                    value={specialization} 
                    onChange={(e) => setSpecialization(e.target.value)}
                    required
                  >
                    <option value="">Select Specialization</option>
                    <option value="Visa Expert">Visa Expert</option>
                    <option value="SOP Specialist">SOP Specialist</option>
                    <option value="Loan Advisor">Loan Advisor</option>
                    <option value="University Counselor">University Counselor</option>
                    <option value="Career Coach">Career Coach</option>
                  </select>
                </div>
              </div>
              </>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex justify-center items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isLogin ? 'Sign in' : 'Create account'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-surface-glass text-foreground-muted">
                  {isLogin ? 'New to EduFinAI?' : 'Already have an account?'}
                </span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError(null)
                }}
                className="text-primary hover:text-primary-light font-medium transition-colors"
              >
                {isLogin ? 'Create an account' : 'Sign in to your account'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
