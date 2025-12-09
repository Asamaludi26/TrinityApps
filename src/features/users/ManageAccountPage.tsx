
import React, { useState, useMemo } from 'react';
import { User } from '../../types';
import FormPageLayout from '../../components/layout/FormPageLayout';
import { useNotification } from '../../providers/NotificationProvider';
import { SpinnerIcon } from '../../components/icons/SpinnerIcon';
import { UserIcon } from '../../components/icons/UserIcon';
import { EnvelopeIcon } from '../../components/icons/EnvelopeIcon';
import { LockIcon } from '../../components/icons/LockIcon';
import { EyeIcon } from '../../components/icons/EyeIcon';
import { EyeSlashIcon } from '../../components/icons/EyeSlashIcon';
import { CheckIcon } from '../../components/icons/CheckIcon';
import { CloseIcon } from '../../components/icons/CloseIcon';
import { useAuthStore } from '../../stores/useAuthStore';
import * as api from '../../services/api';

interface ManageAccountPageProps {
    currentUser: User;
    onSave: (data: { name: string; email: string; currentPassword?: string; newPassword?: string }) => Promise<boolean>; // Legacy
    onBack: () => void;
}

const FormSection: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="pt-6 border-t border-gray-200 first:pt-0 first:border-t-0">
        <div className="flex items-center mb-4">
            {icon}
            <h3 className="text-lg font-semibold text-tm-dark">{title}</h3>
        </div>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

const PasswordStrengthMeter: React.FC<{ passwordStrength: { score: number; label: string; color: string; } }> = ({ passwordStrength }) => {
    if (passwordStrength.score === 0) {
        return null;
    }

    return (
        <div className="flex items-center gap-3 mt-2">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color}`}
                    style={{ width: `${passwordStrength.score * 25}%` }}
                ></div>
            </div>
            <span className={`text-xs font-semibold w-20 text-right ${
                passwordStrength.score <= 1 ? 'text-red-500' :
                passwordStrength.score === 2 ? 'text-orange-500' :
                passwordStrength.score === 3 ? 'text-blue-500' :
                'text-green-500'
            }`}>
                {passwordStrength.label}
            </span>
        </div>
    );
};


const ManageAccountPage: React.FC<ManageAccountPageProps> = ({ currentUser, onBack }) => {
    const updateCurrentUserStore = useAuthStore((state) => state.updateCurrentUser);
    
    const [name, setName] = useState(currentUser.name);
    const [email, setEmail] = useState(currentUser.email);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [nameError, setNameError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const [passwordVisibility, setPasswordVisibility] = useState({
        current: false,
        new: false,
        confirm: false,
    });

    const [isLoading, setIsLoading] = useState(false);
    const addNotification = useNotification();

    const allowedSymbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";
    const allowedSymbolsRegex = new RegExp(`^[a-zA-Z0-9${allowedSymbols.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}]+$`);

    const passwordChecks = useMemo(() => {
        const password = newPassword;
        return {
            length: password.length >= 8,
            upperLower: /[A-Z]/.test(password) && /[a-z]/.test(password),
            number: /\d/.test(password),
            symbol: new RegExp(`[${allowedSymbols.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}]`).test(password),
            noSpaces: !/\s/.test(password),
            onlyAllowed: password === '' || allowedSymbolsRegex.test(password),
        };
    }, [newPassword, allowedSymbolsRegex]);

    const passwordStrength = useMemo(() => {
        const checks = passwordChecks;
        if (!newPassword) return { score: 0, label: '', color: '' };
        
        let score = 0;
        if (checks.length) score++;
        if (checks.upperLower) score++;
        if (checks.number) score++;
        if (checks.symbol) score++;

        if (!checks.noSpaces || !checks.onlyAllowed) return { score: 1, label: 'Error', color: 'bg-red-500' };
        if (score === 0 && newPassword.length > 0) return { score: 1, label: 'Lemah', color: 'bg-red-500' };

        if (score === 1) return { score: 1, label: 'Lemah', color: 'bg-red-500' };
        if (score === 2) return { score: 2, label: 'Sedang', color: 'bg-orange-500' };
        if (score === 3) return { score: 3, label: 'Kuat', color: 'bg-blue-500' };
        if (score >= 4) return { score: 4, label: 'Sangat Kuat', color: 'bg-green-500' };
        return { score: 0, label: '', color: '' };
    }, [newPassword, passwordChecks]);

    const validate = () => {
        let isValid = true;
        setNameError('');
        setEmailError('');
        setPasswordError('');

        if (name.trim().length < 3) {
            setNameError('Nama harus memiliki minimal 3 karakter.');
            isValid = false;
        }
        if (!/\S+@\S+\.\S+/.test(email)) {
            setEmailError('Format email tidak valid.');
            isValid = false;
        }

        // Jika salah satu kolom kata sandi diisi, jalankan validasi lengkap untuk kata sandi
        if (isValid && (currentPassword || newPassword || confirmPassword)) {
            if (!currentPassword) {
                setPasswordError('Kata sandi saat ini harus diisi untuk mengatur kata sandi baru.');
                isValid = false;
            } else if (!newPassword) {
                setPasswordError('Kata sandi baru harus diisi.');
                isValid = false;
            } else if (!passwordChecks.length) {
                setPasswordError('Kata sandi baru harus memiliki minimal 8 karakter.');
                isValid = false;
            } else if (!passwordChecks.upperLower) {
                setPasswordError('Kata sandi baru harus mengandung kombinasi huruf besar dan kecil.');
                isValid = false;
            } else if (!passwordChecks.number) {
                setPasswordError('Kata sandi baru harus mengandung setidaknya satu angka.');
                isValid = false;
            } else if (!passwordChecks.symbol) {
                setPasswordError('Kata sandi baru harus mengandung setidaknya satu simbol.');
                isValid = false;
            } else if (!passwordChecks.noSpaces) {
                setPasswordError('Kata sandi baru tidak boleh mengandung spasi.');
                isValid = false;
            } else if (!passwordChecks.onlyAllowed) {
                setPasswordError('Kata sandi baru mengandung simbol yang tidak diizinkan.');
                isValid = false;
            } else if (newPassword !== confirmPassword) {
                setPasswordError('Konfirmasi kata sandi baru tidak cocok.');
                isValid = false;
            }
        }
        
        return isValid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) {
            addNotification('Harap perbaiki error pada formulir.', 'error');
            return;
        }
        
        setIsLoading(true);

        // Simulate update
        setTimeout(() => {
            const updatedUser = {
                ...currentUser,
                name: name,
                email: email,
            };
            
            // Update in store
            updateCurrentUserStore(updatedUser);
            
            // Also update in localStorage persistence if handled by api in real scenario
            api.updateData('app_users', (prevUsers: User[]) => prevUsers.map(u => u.id === currentUser.id ? updatedUser : u));

            addNotification('Akun berhasil diperbarui.', 'success');
            setIsLoading(false);
            
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        }, 800);
    };
    
    const CheckListItem: React.FC<{ met: boolean; text: React.ReactNode }> = ({ met, text }) => (
         <li className={`flex items-start gap-2 transition-colors ${met ? 'text-green-700' : 'text-gray-500'}`}>
            {met
                ? <CheckIcon className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                : <CloseIcon className="w-4 h-4 mt-0.5 text-red-500 flex-shrink-0" />}
            <span>{text}</span>
        </li>
    );

    return (
        <FormPageLayout title="Kelola Akun Saya">
            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-8">
                <FormSection title="Profil" icon={<UserIcon className="w-6 h-6 mr-3 text-tm-primary" />}>
                     <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nama Lengkap</label>
                        <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} required className="block w-full px-3 py-2 mt-1 bg-gray-50 border border-gray-300 text-sm text-gray-700 rounded-lg shadow-sm" />
                        {nameError && <p className="mt-1 text-xs text-danger-text">{nameError}</p>}
                    </div>
                     <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Alamat Email</label>
                        <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} required className="block w-full px-3 py-2 mt-1 bg-gray-50 border border-gray-300 text-sm text-gray-700 rounded-lg shadow-sm" />
                        {emailError && <p className="mt-1 text-xs text-danger-text">{emailError}</p>}
                    </div>
                </FormSection>

                <FormSection title="Ubah Kata Sandi" icon={<LockIcon className="w-6 h-6 mr-3 text-tm-primary" />}>
                    <p className="text-sm text-gray-500 -mt-2">Kosongkan jika Anda tidak ingin mengubah kata sandi.</p>
                    <div>
                        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">Kata Sandi Saat Ini</label>
                        <div className="relative mt-1">
                            <input type={passwordVisibility.current ? 'text' : 'password'} id="currentPassword" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="block w-full px-3 py-2 pr-10 bg-gray-50 border border-gray-300 text-sm text-gray-700 rounded-lg shadow-sm" />
                            <button type="button" onClick={() => setPasswordVisibility(p => ({...p, current: !p.current}))} className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-tm-primary">
                                {passwordVisibility.current ? <EyeSlashIcon className="w-5 h-5"/> : <EyeIcon className="w-5 h-5"/>}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">Kata Sandi Baru</label>
                        <div className="relative mt-1">
                            <input type={passwordVisibility.new ? 'text' : 'password'} id="newPassword" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="block w-full px-3 py-2 pr-10 bg-gray-50 border border-gray-300 text-sm text-gray-700 rounded-lg shadow-sm" />
                            <button type="button" onClick={() => setPasswordVisibility(p => ({...p, new: !p.new}))} className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-tm-primary">
                                {passwordVisibility.new ? <EyeSlashIcon className="w-5 h-5"/> : <EyeIcon className="w-5 h-5"/>}
                            </button>
                        </div>
                        {newPassword && <PasswordStrengthMeter passwordStrength={passwordStrength} />}
                        {newPassword && (
                            <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 space-y-1">
                                <p className="font-semibold text-gray-700 mb-2">Kata sandi harus memenuhi kriteria berikut:</p>
                                <ul className="space-y-1.5">
                                    <CheckListItem met={passwordChecks.length} text="Minimal 8 karakter." />
                                    <CheckListItem met={passwordChecks.upperLower} text="Kombinasi huruf besar dan kecil." />
                                    <CheckListItem met={passwordChecks.number} text="Sertakan setidaknya satu angka." />
                                    <CheckListItem met={passwordChecks.symbol} text={<span>Sertakan setidaknya satu simbol (<code>!@#$%^&*...</code>).</span>} />
                                    <CheckListItem met={passwordChecks.noSpaces} text="Tidak boleh mengandung spasi." />
                                     <CheckListItem met={passwordChecks.onlyAllowed} text={<span>Hanya menggunakan simbol yang diizinkan: <code className="break-all">{allowedSymbols}</code></span>} />
                                </ul>
                            </div>
                        )}
                    </div>
                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Konfirmasi Kata Sandi Baru</label>
                         <div className="relative mt-1">
                            <input type={passwordVisibility.confirm ? 'text' : 'password'} id="confirmPassword" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="block w-full px-3 py-2 pr-10 bg-gray-50 border border-gray-300 text-sm text-gray-700 rounded-lg shadow-sm" />
                             <button type="button" onClick={() => setPasswordVisibility(p => ({...p, confirm: !p.confirm}))} className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-tm-primary">
                                {passwordVisibility.confirm ? <EyeSlashIcon className="w-5 h-5"/> : <EyeIcon className="w-5 h-5"/>}
                            </button>
                        </div>
                    </div>
                    {passwordError && <p className="mt-1 text-xs text-danger-text">{passwordError}</p>}
                </FormSection>
                
                <div className="flex justify-end pt-5 space-x-3 border-t">
                    <button type="button" onClick={onBack} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">
                        Kembali
                    </button>
                    <button type="submit" disabled={isLoading} className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover disabled:bg-tm-primary/70">
                        {isLoading && <SpinnerIcon className="w-5 h-5 mr-2"/>}
                        Simpan Perubahan
                    </button>
                </div>
            </form>
        </FormPageLayout>
    );
};

export default ManageAccountPage;
