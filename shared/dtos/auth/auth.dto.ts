export interface AuthUserDTO {
  id: number;
  email: string | null;
  name: string | null;
  avatar: string | null;
  role: string;
}

export interface AuthResponseDTO {
  user: AuthUserDTO;
  accessToken: string;
  refreshToken: string;
}

export interface GoogleLoginDTO {
  idToken: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface SendOtpDTO {
  email: string;
}

export interface VerifyOtpDTO {
  email: string;
  otp: string;
  password: string;
}

export interface RefreshDTO {
  refreshToken: string;
}

export class AuthMapper {
  static toAuthUserDTO(user: any): AuthUserDTO {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
    };
  }

  static toAuthResponse(user: any, accessToken: string, refreshToken: string): AuthResponseDTO {
    return {
      user: this.toAuthUserDTO(user),
      accessToken,
      refreshToken,
    };
  }
}
