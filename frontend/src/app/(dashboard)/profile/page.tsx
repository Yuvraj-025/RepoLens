'use client';

import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Save, AlertTriangle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getProfile, updateProfile } from '@/lib/api/auth';

export default function ProfilePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = await getProfile();
        setFormData(prev => ({ ...prev, name: user.name, email: user.email }));
      } catch (err: any) {
        if (err.message && err.message.includes('401:')) {
          router.push('/login');
        } else {
          setNotification({ type: 'error', message: err.message || 'Failed to load profile' });
        }
      }
    };
    fetchProfile();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    if (formData.password && formData.password !== formData.confirmPassword) {
      setNotification({ type: 'error', message: 'Passwords do not match!' });
      return;
    }

    setIsSaving(true);
    
    try {
      const dataToUpdate: any = { name: formData.name, email: formData.email };
      if (formData.password) dataToUpdate.password = formData.password;
      
      await updateProfile(dataToUpdate);
      setNotification({ type: 'success', message: 'PROFILE.UPDATE(SUCCESS)' });
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' })); // clear passwords
    } catch (err: any) {
      if (err.message && err.message.includes('401:')) {
        router.push('/login');
      } else {
        setNotification({ type: 'error', message: err.message || 'Update failed' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto h-full flex flex-col">
      <div className="border-b-2 border-retro-green-dim pb-4 mb-8">
        <h1 className="text-4xl uppercase tracking-wider mb-2">&gt; USER_PROFILE_SYS</h1>
        <p className="text-xl text-retro-green-dim">MODIFY ENTITY PARAMETERS</p>
      </div>

      {notification && (
        <div className={`border-2 p-4 mb-8 flex items-center gap-3 ${notification.type === 'error' ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-retro-green/20 border-retro-green text-retro-green'}`}>
          {notification.type === 'error' ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
          <span className="text-xl font-bold">{notification.message}</span>
        </div>
      )}

      <div className="border-2 border-retro-green p-8 bg-retro-bg/50 flex-1 relative overflow-y-auto">
        <div className="absolute top-4 right-4 text-retro-green/20">
          <User className="w-32 h-32" />
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
          <div className="space-y-2">
            <label className="text-xl uppercase text-retro-green-dim flex items-center gap-2">
              <User className="w-5 h-5" /> ENTITY_NAME
            </label>
            <input 
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full bg-retro-bg border-2 border-retro-green p-3 text-xl text-retro-cyan focus:outline-none focus:border-retro-cyan transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xl uppercase text-retro-green-dim flex items-center gap-2">
              <Mail className="w-5 h-5" /> CONTACT_ADDR
            </label>
            <input 
              type="email" 
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full bg-retro-bg border-2 border-retro-green p-3 text-xl text-retro-cyan focus:outline-none focus:border-retro-cyan transition-colors"
            />
          </div>

          <div className="border-t-2 border-retro-green-dim border-dashed pt-8 mt-8 space-y-6">
            <h3 className="text-2xl text-retro-cyan uppercase flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-yellow-500" /> SECURE_CREDENTIALS
            </h3>
            
            <div className="space-y-2">
              <label className="text-xl uppercase text-retro-green-dim flex items-center gap-2">
                <Lock className="w-5 h-5" /> NEW_PASSWORD
              </label>
              <input 
                type="password" 
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full bg-retro-bg border-2 border-retro-green p-3 text-xl text-retro-cyan focus:outline-none focus:border-retro-cyan transition-colors font-mono"
                placeholder="[ LEAVE BLANK TO KEEP CURRENT ]"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xl uppercase text-retro-green-dim flex items-center gap-2">
                <Lock className="w-5 h-5" /> VERIFY_PASSWORD
              </label>
              <input 
                type="password" 
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                className="w-full bg-retro-bg border-2 border-retro-green p-3 text-xl text-retro-cyan focus:outline-none focus:border-retro-cyan transition-colors font-mono"
                placeholder="[ CONFIRM NEW PASSWORD ]"
              />
            </div>
          </div>

          <div className="pt-8 flex justify-end">
            <button 
              type="submit"
              disabled={isSaving}
              className="border-2 border-retro-green bg-retro-green text-retro-bg px-8 py-3 text-xl font-bold hover:bg-retro-cyan hover:border-retro-cyan shadow-retro shadow-retro-green hover:shadow-retro-hover hover:translate-x-[2px] hover:translate-y-[2px] transition-all uppercase flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-6 h-6" />
              {isSaving ? 'UPDATING...' : 'SAVE_PARAMETERS()'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
