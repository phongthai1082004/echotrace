import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
    name: z.string().min(1, "Name is required").max(100),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const otpSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  phone: z
    .string()
    .regex(/^0\d{8,10}$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal("")),
  avatar: z.string().url().optional().or(z.literal("")),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type OTPFormData = z.infer<typeof otpSchema>;
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;
