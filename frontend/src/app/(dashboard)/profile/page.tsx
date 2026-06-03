'use client';

import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Save, AlertTriangle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getProfile, updateProfile } from '@/lib/api/auth';
import { copyContent } from '@/lib/content';

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

  const c = copyContent.profile;

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
      setNotification({ type: 'success', message: c.successNotification });
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
    <div className="max-w-3xl mx-auto min-h-full flex flex-col space-y-8 animate-reveal-up pb-8">
      
      {/* Page Header */}
      <div className="border-b border-lux-border pb-4 mb-4">
        <h1 className="text-3xl font-serif font-light tracking-widest text-lux-creme uppercase">
          {c.title}
        </h1>
        <p className="text-[10px] font-mono tracking-[0.25em] text-lux-creme-dim mt-1 uppercase">
          {c.subtitle}
        </p>
      </div>

      {notification && (
        <div 
          className={`border p-4 text-xs font-mono flex items-center gap-3 ${
            notification.type === 'error' 
              ? 'bg-lux-copper/10 border-lux-copper/40 text-lux-copper' 
              : 'bg-lux-gold/10 border-lux-gold/45 text-lux-gold'
          }`}
        >
          {notification.type === 'error' ? <AlertTriangle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle className="w-4 h-4 flex-shrink-0" />}
          <span className="font-bold">{notification.message}</span>
        </div>
      )}

      {/* Profile Form Card */}
      <div className="border border-lux-border p-5 sm:p-8 md:p-12 bg-lux-card/25 backdrop-blur-md relative overflow-hidden">
        {/* Subtle decorative wireframe overlay */}
        <div className="absolute -top-12 -right-12 text-lux-border opacity-20 pointer-events-none">
          <User className="w-48 h-48" />
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Alias name */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono tracking-widest text-lux-creme-dim flex items-center gap-2 uppercase">
                <User className="w-3.5 h-3.5 text-lux-gold" /> {c.labelName}
              </label>
              <input 
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full bg-lux-bg/40 border border-lux-border p-3.5 font-mono text-sm text-lux-creme focus:border-lux-gold/50 focus:outline-none transition-all duration-300"
              />
            </div>

            {/* Comms addr */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono tracking-widest text-lux-creme-dim flex items-center gap-2 uppercase">
                <Mail className="w-3.5 h-3.5 text-lux-gold" /> {c.labelEmail}
              </label>
              <input 
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full bg-lux-bg/40 border border-lux-border p-3.5 font-mono text-sm text-lux-creme focus:border-lux-gold/50 focus:outline-none transition-all duration-300"
              />
            </div>
          </div>

          {/* Secure Credentials Segment */}
          <div className="border-t border-lux-border border-dashed pt-8 mt-8 space-y-6">
            <h3 className="text-sm font-serif tracking-widest text-lux-creme uppercase flex items-center gap-2">
              <Lock className="w-4 h-4 text-lux-gold" /> {c.sectionTitle}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* New Password */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono tracking-widest text-lux-creme-dim flex items-center gap-2 uppercase">
                  {c.labelNewPassword}
                </label>
                <input 
                  type="password" 
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full bg-lux-bg/40 border border-lux-border p-3.5 font-mono text-sm text-lux-creme focus:border-lux-gold/50 focus:outline-none transition-all duration-300"
                  placeholder={c.placeholderNewPassword}
                />
              </div>
              
              {/* Confirm Password */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono tracking-widest text-lux-creme-dim flex items-center gap-2 uppercase">
                  {c.labelConfirmPassword}
                </label>
                <input 
                  type="password" 
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  className="w-full bg-lux-bg/40 border border-lux-border p-3.5 font-mono text-sm text-lux-creme focus:border-lux-gold/50 focus:outline-none transition-all duration-300"
                  placeholder={c.placeholderConfirmPassword}
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-6 flex justify-end">
            <button 
              type="submit"
              disabled={isSaving}
              className="border border-lux-gold/30 bg-lux-card hover:bg-lux-gold hover:text-lux-bg px-8 py-3.5 font-mono text-xs tracking-[0.2em] font-bold uppercase transition-all duration-500 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? c.buttonLoading : c.buttonSave}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
