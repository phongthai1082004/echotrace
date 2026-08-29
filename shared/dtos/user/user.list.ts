export interface UserListDTO {
  id: number;
  email: string | null;
  name: string | null;
  avatar: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  banned: boolean;
  role: string;
  createdAt?: Date | string | null;
}
export class UserMapper {
    static toDTO(user: any) {
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            phone: user.phone,
            address: user.address,
            city: user.city,
            banned: !!user.isDelete,
            role: user.role,
            createdAt: user.createdAt ?? null,
        };
    }
    static toDTOList(users: any[]): UserListDTO[] {
        return users.map(user => this.toDTO(user));
    }
}