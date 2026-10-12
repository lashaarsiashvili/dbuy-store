import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Lock, KeyRound, X, Check, Loader2, ShieldCheck } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const { user, changeUserPassword, language, addToast } = useStore();
  const isKa = language === 'ka';

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword) {
      addToast(isKa ? 'გთხოვთ მიუთითოთ მიმდინარე პაროლი' : 'Please enter current password', 'warning');
      return;
    }
    if (newPassword.length < 4) {
      addToast(isKa ? 'ახალი პაროლი უნდა იყოს სულ მცირე 4 სიმბოლო' : 'New password must be at least 4 characters', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast(isKa ? 'ახალი პაროლები ერთმანეთს არ ემთხვევა' : 'New passwords do not match', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await changeUserPassword(oldPassword, newPassword);
      if (success) {
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onClose();
      }
    } catch {
      // handled inside changeUserPassword
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-white/10 border border-white/20">
              <KeyRound className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold">
                {isKa ? '🔑 პაროლის შეცვლა' : '🔑 Change Password'}
              </h3>
              <p className="text-[11px] text-blue-100 truncate max-w-[240px]">
                {user.email}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isKa ? 'მიმდინარე (ძველი) პაროლი *' : 'Current Password *'}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input type="password"
                required
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                placeholder={isKa ? 'შეიყვანეთ ძველი პაროლი...' : 'Enter current password...'}
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isKa ? 'ახალი პაროლი *' : 'New Password *'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder={isKa ? 'შეიყვანეთ ახალი პაროლი...' : 'Enter new password...'}
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isKa ? 'გაიმეორეთ ახალი პაროლი *' : 'Confirm New Password *'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder={isKa ? 'გაიმეორეთ ახალი პაროლი...' : 'Confirm new password...'}
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 text-blue-800 dark:text-blue-300 text-[11px] flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p>
              {isKa 
                ? 'პაროლის შეცვლისთანავე ახალი პაროლი ავტომატურად სინქრონიზდება სერვერთან და იმოქმედებს ყველა მოწყობილობაზე.'
                : 'Your password will be immediately updated and synchronized across all your devices.'}
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              {isKa ? 'გაუქმება' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{isKa ? 'ინახება...' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{isKa ? 'პაროლის განახლება' : 'Update Password'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
