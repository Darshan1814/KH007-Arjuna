import { useAppStore } from '@/lib/store'
import { User, Mail, MapPin, GraduationCap, Briefcase, Globe, Target } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ProfilePage() {
  const { profile } = useAppStore()

  const InfoCard = ({ icon: Icon, title, value }: any) => (
    <div className="bg-surface border border-border rounded-xl p-4 flex items-start gap-4">
      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm text-foreground-secondary">{title}</p>
        <p className="font-semibold text-foreground mt-1">{value || 'Not provided'}</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Your Profile</h1>
        <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
          Dream Score: {profile.dreamScore}
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 md:p-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InfoCard icon={User} title="Full Name" value={profile.name} />
          <InfoCard icon={Mail} title="Email / Mobile" value={profile.email || profile.mobile} />
          <InfoCard icon={MapPin} title="Location" value={profile.city ? `${profile.city}, ${profile.state}` : ''} />
          <InfoCard icon={GraduationCap} title="Education Level" value={profile.educationLevel} />
          <InfoCard icon={Briefcase} title="Experience" value={profile.isWorkingProfessional === 'Yes' ? `${profile.jobRole} at ${profile.companyName}` : 'Student'} />
          <InfoCard icon={Globe} title="Target Destinations" value={profile.targetCountries?.join(', ')} />
          <InfoCard icon={Target} title="Study Goal" value={profile.studyGoal} />
        </div>
      </motion.div>

      <div className="card p-6 md:p-8">
        <h2 className="text-xl font-semibold mb-4">Academic Background</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-foreground-secondary">10th / 12th</p>
            <p className="font-medium mt-1">{profile.tenthMarks} / {profile.twelfthMarks}</p>
          </div>
          <div>
            <p className="text-sm text-foreground-secondary">Undergrad</p>
            <p className="font-medium mt-1">{profile.undergradDegree} in {profile.undergradSpecialization}</p>
            <p className="text-sm text-foreground-muted">{profile.undergradCollege}</p>
          </div>
          <div>
            <p className="text-sm text-foreground-secondary">CGPA</p>
            <p className="font-medium mt-1">{profile.undergradCgpa}</p>
          </div>
        </div>
      </div>

      <div className="card p-6 md:p-8">
        <h2 className="text-xl font-semibold mb-4">Test Scores</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-surface p-4 rounded-lg text-center">
            <p className="text-sm text-foreground-secondary">GRE</p>
            <p className="text-lg font-bold text-primary mt-1">{profile.greScoreStr || 'N/A'}</p>
          </div>
          <div className="bg-surface p-4 rounded-lg text-center">
            <p className="text-sm text-foreground-secondary">IELTS</p>
            <p className="text-lg font-bold text-primary mt-1">{profile.ieltsScore || 'N/A'}</p>
          </div>
          <div className="bg-surface p-4 rounded-lg text-center">
            <p className="text-sm text-foreground-secondary">GMAT</p>
            <p className="text-lg font-bold text-primary mt-1">{profile.gmatScoreStr || 'N/A'}</p>
          </div>
          <div className="bg-surface p-4 rounded-lg text-center">
            <p className="text-sm text-foreground-secondary">TOEFL</p>
            <p className="text-lg font-bold text-primary mt-1">{profile.toeflScore || 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
