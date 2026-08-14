export interface ProfileDTO {
  id: number;
  email: string | null;
  name: string | null;
  avatar: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  role: string;
  banned: boolean;
  hasPassword: boolean;
}

export interface UpdateProfileDTO {
  name: string;
  phone?: string;
  address: string;
  city: string;
}

export interface ChangePasswordDTO {
  currentPassword?: string;
  newPassword: string;
}

export class ProfileMapper {
  static toDTO(user: any): ProfileDTO {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      phone: user.phone,
      address: user.address,
      city: user.city,
      role: user.role,
      banned: !!user.isDelete,
      hasPassword: user.hasPassword,
    };
  }
}
