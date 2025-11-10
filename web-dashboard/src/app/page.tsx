'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Brain, Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="relative min-h-screen bg-white overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1/2 -left-1/4 w-[800px] h-[800px] bg-gradient-to-br from-purple-400 to-pink-400 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], rotate: [0, -90, 0], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear", delay: 5 }}
          className="absolute -bottom-1/2 -right-1/4 w-[800px] h-[800px] bg-gradient-to-tr from-indigo-400 to-cyan-400 rounded-full blur-3xl"
        />
      </div>

      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50"
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <motion.div whileHover={{ scale: 1.05 }} className="flex items-center gap-3 cursor-pointer">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="relative w-12 h-12 bg-gradient-to-br from-purple-600 via-pink-500 to-indigo-600 rounded-2xl shadow-2xl shadow-purple-500/50 flex items-center justify-center"
              >
                <Brain className="w-7 h-7 text-white" />
              </motion.div>
              <span className="text-3xl font-black bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent">
                MindHive
              </span>
            </motion.div>

            <div className="flex items-center gap-4">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="ghost" onClick={() => router.push('/auth/login')} className="text-gray-700 hover:text-purple-600 font-semibold text-lg px-6">
                  Sign In
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                <Button onClick={() => router.push('/auth/register')} className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white font-bold text-lg px-8 py-6 rounded-xl shadow-2xl shadow-purple-500/50">
                  Get Started Free
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.nav>

      <section className="relative z-10 flex items-center justify-center min-h-[calc(100vh-80px)] px-6">
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center space-y-12 py-20">
            <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, type: "spring", stiffness: 200 }} className="flex justify-center">
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/80 backdrop-blur-sm border-2 border-purple-200 shadow-xl">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </motion.div>
                <span className="text-gray-900 font-bold text-base">Powered by 5 AI Models • Zero Hallucinations</span>
              </div>
            </motion.div>

            <div className="space-y-6">
              <motion.h1 initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="text-7xl md:text-8xl lg:text-9xl font-black tracking-tight leading-none">
                <span className="block text-gray-900">Your AI</span>
                <span className="block mt-4 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent">Developer Team</span>
              </motion.h1>

              <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }} className="text-2xl md:text-3xl lg:text-4xl text-gray-600 font-medium max-w-5xl mx-auto leading-relaxed">
                Five specialized AI agents working <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">24/7</span> on your code.
                <br /><span className="font-black text-gray-900">Ship faster. Build better. Never look back.</span>
              </motion.p>
            </div>

            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.6 }} className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8">
              <motion.div whileHover={{ scale: 1.05, y: -5 }} whileTap={{ scale: 0.95 }}>
                <Button size="lg" onClick={() => router.push('/auth/register')} className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white px-16 h-24 text-2xl font-black rounded-2xl shadow-2xl shadow-purple-500/50">
                  Start Building Free <ArrowRight className="w-8 h-8 ml-4 inline-block" />
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 bg-gray-50 border-t border-gray-200 py-12 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
          <Brain className="w-6 h-6 text-purple-600" />
          <span className="text-xl font-black text-gray-900">MindHive</span>
        </div>
      </footer>
    </div>
  );
}

