import { Link } from 'react-router-dom';
import { LoginForm } from '../components/LoginForm';
import { motion } from 'framer-motion';
import { ChevronRight, ShieldCheck } from 'lucide-react';
// import empriseLogo from '../../../assets/empriseLogo.png';
import empriseLogo from '../../../assets/emprise.jpeg';

// Minimal geometric background animation
const MinimalBackground = () => {
  return (
    <div className="relative w-full h-full bg-gray-50/50 overflow-hidden">
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-grid-slate-100/50" />
      
      {/* Minimal decorative elements */}
      <div className="absolute inset-0">
        <motion.div 
          className="absolute left-0 top-0 w-64 h-64 bg-primary/5 rounded-full -translate-x-1/2 -translate-y-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        />
        <motion.div 
          className="absolute right-0 bottom-0 w-96 h-96 bg-primary/5 rounded-full translate-x-1/2 translate-y-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
        />
      </div>

      {/* Content */}
      <div className="relative h-full flex flex-col justify-center px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-12"
        >
          {/* Company Logo */}
          <div className="mb-8">
            <img src={empriseLogo} alt="Emprise Univora Logo" className="h-12" />
          </div>
          
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            {location.pathname === '/login' ? 'Welcome back' : 'Get started'}
          </h2>
          <p className="text-gray-600 max-w-sm leading-relaxed">
            {location.pathname === '/login' 
              ? 'Streamline your procurement process with our integrated management system.'
              : 'Create an account to start managing your procurement processes effectively.'}
          </p>
        </motion.div>

        {/* Feature points */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="space-y-6"
        >
          <FeaturePoint 
            title="Secure Access"
            description="Enterprise-grade security for your procurement data"
            icon={<ShieldCheck className="w-5 h-5" />}
          />
          <FeaturePoint 
            title="Streamlined Workflow"
            description="Efficient process management from start to finish"
            icon={<ChevronRight className="w-5 h-5" />}
          />
        </motion.div>
      </div>
    </div>
  );
};

// Feature point component
const FeaturePoint = ({ title, description, icon }: { title: string, description: string, icon: React.ReactNode }) => (
  <div className="flex items-start space-x-3">
    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
      {icon}
    </div>
    <div>
      <h3 className="text-sm font-medium text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  </div>
);

// Auth layout with minimal design
export function AuthLayout({ children, title, description }: { children: React.ReactNode, title: string, description: string }) {
  return (
    <div className="min-h-screen w-full flex bg-white">
      {/* Left side - Form */}
      <div className="w-full lg:w-[480px] flex flex-col justify-center p-8 lg:p-12">
        <div className="w-full max-w-sm mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">{title}</h1>
            <p className="text-gray-600">{description}</p>
          </motion.div>
          
          {children}
        </div>
      </div>

      {/* Right side - Background */}
      <div className="hidden lg:block flex-1">
        <MinimalBackground />
      </div>
    </div>
  );
}

// Enhanced forms with better spacing and transitions
const FormContainer = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.5, delay: 0.2 }}
  >
    {children}
  </motion.div>
);

// Login Page
export function LoginPage() {
  return (
    <AuthLayout 
      title="Sign in to your account"
      description="Enter your credentials to access your workspace"
    >
      <FormContainer>
        <LoginForm />
        <div className="mt-6 text-sm text-center">
          <span className="text-gray-600">Don't have an account? </span>
          <Link 
            to="/register" 
            className="text-primary hover:text-primary/90 font-medium transition-colors"
          >
            Create one
          </Link>
        </div>
      </FormContainer>
    </AuthLayout>
  );
}