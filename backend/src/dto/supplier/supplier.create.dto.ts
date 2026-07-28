import { 
    IsString, 
    IsNotEmpty, 
    IsEmail, 
} from "class-validator";

export class CreateSupplierDTO {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  contact!: string;

  @IsString()
  @IsEmail()
  email!: string;
}
