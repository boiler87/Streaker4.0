import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Award, AlertTriangle, User, Lock, Mail, ArrowRight } from 'lucide-react';

const Auth: React.FC = () => {
  const { signIn, signUp, loading, error, setError } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  if (loading) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      await signIn(email, password);
    } else {
      await signUp(email, password, name);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-darker p-4 text-center">
        <div className="bg-card p-8 rounded-3xl border border-gray-800 shadow-2xl max-w-sm w-full">
            <div className="flex justify-center mb-6">
                <div className="bg-primary/20 p-4 rounded-2xl">
                    <Award className="text-primary w-12 h-12" />
                </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Streaker</h1>
            <p className="text-gray-400 mb-8">Master your impulses. Track your journey.</p>
            
            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-sm text-left flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div className="break-words w-full">
                        <p className="font-bold">Error</p>
                        <p className="mt-1 opacity-90">{error}</p>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
                {!isLogin && (
                    <div>
                        <label className="text-xs text-gray-500 font-bold uppercase ml-1">Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3.5 text-gray-500 w-5 h-5" />
                            <input 
                                type="text" 
                                placeholder="Your Name" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-darker border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-primary outline-none focus:ring-1 focus:ring-primary"
                                required={!isLogin}
                            />
                        </div>
                    </div>
                )}
                <div>
                    <label className="text-xs text-gray-500 font-bold uppercase ml-1">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3.5 text-gray-500 w-5 h-5" />
                        <input 
                            type="email" 
                            placeholder="hello@example.com" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-darker border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-primary outline-none focus:ring-1 focus:ring-primary"
                            required
                        />
                    </div>
                </div>
                <div>
                    <label className="text-xs text-gray-500 font-bold uppercase ml-1">Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3.5 text-gray-500 w-5 h-5" />
                        <input 
                            type="password" 
                            placeholder="••••••••" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-darker border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-primary outline-none focus:ring-1 focus:ring-primary"
                            required
                        />
                    </div>
                </div>

                <button 
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center transition-all mt-4 group"
                >
                    {isLogin ? 'Sign In' : 'Create Account'}
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
            </form>

            <div className="mt-6 text-sm">
                <span className="text-gray-500">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                </span>
                <button 
                    onClick={() => { setIsLogin(!isLogin); setError(null); }}
                    className="text-primary hover:text-white font-semibold transition-colors"
                >
                    {isLogin ? 'Sign Up' : 'Log In'}
                </button>
            </div>
        </div>
    </div>
  );
};

export default Auth;