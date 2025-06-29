
import React from 'react';
import { ModalType } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import Button from '../components/Button';
import InitialAvatar from '../components/InitialAvatar'; // Added InitialAvatar
import { DEFAULT_USER_BIO, DEFAULT_USER_NAME } from '../constants'; // Removed DEFAULT_AVATAR_PATH

interface ProfileScreenProps {
  openModal: (modalType: ModalType, data?: any) => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ openModal }) => {
  const { userProfile } = useSettings();

  // Effective values handled by InitialAvatar for avatar, and defaults for name/bio
  const effectiveName = userProfile.name || DEFAULT_USER_NAME;
  const effectiveBio = userProfile.bio || DEFAULT_USER_BIO;

  return (
    <div className="p-4 sm:p-6 flex-grow bg-slate-50 dark:bg-slate-900">
      <header className="mb-8 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary dark:text-primary-light">Hồ Sơ Của Bạn</h1>
      </header>

      <div className="max-w-xl mx-auto bg-card-light dark:bg-card-dark p-6 sm:p-8 rounded-xl shadow-xl">
        <div className="flex flex-col items-center mb-6">
          <InitialAvatar
            name={effectiveName}
            avatarUrl={userProfile.avatarUrl}
            className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-primary dark:border-primary-light shadow-lg mb-4"
            altText="Ảnh đại diện của bạn"
          />
          <h2 className="text-xl sm:text-2xl font-semibold text-text-light dark:text-text-dark">{effectiveName}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-1">{effectiveBio}</p>
        </div>

        <div className="space-y-4">
          <Button
            variant="primary"
            fullWidth
            onClick={() => openModal(ModalType.UserProfileSettings)}
            leftIcon={<i className="fas fa-edit"></i>}
            size="lg"
          >
            Chỉnh Sửa Hồ Sơ
          </Button>
          <Button
            variant="outline"
            fullWidth
            onClick={() => openModal(ModalType.CharacterManagementAndImportModal)} // Updated
            leftIcon={<i className="fas fa-users-cog"></i>}
            size="lg"
          >
            Quản Lý & Nhập/Xuất Nhân Vật
          </Button>
          {/* The ImportCharacter button is removed as its functionality is merged */}
          <Button
            variant="outline"
            fullWidth
            onClick={() => openModal(ModalType.MainAppSettings)}
            leftIcon={<i className="fas fa-cogs"></i>}
            size="lg"
          >
            Cài Đặt Ứng Dụng
          </Button>
        </div>
      </div>
       <footer className="mt-12 text-center text-xs text-slate-500 dark:text-slate-400">
          Thông tin hồ sơ của bạn được lưu cục bộ trên thiết bị này.
      </footer>
    </div>
  );
};

export default ProfileScreen;