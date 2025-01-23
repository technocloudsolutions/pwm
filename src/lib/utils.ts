import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface PasswordOptions {
  length?: number;
  includeUppercase?: boolean;
  includeLowercase?: boolean;
  includeNumbers?: boolean;
  includeSymbols?: boolean;
}

export function generatePassword({
  length = 16,
  includeUppercase = true,
  includeLowercase = true,
  includeNumbers = true,
  includeSymbols = true,
}: PasswordOptions = {}): string {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

  let chars = "";
  let password = "";

  // Add character sets based on options
  if (includeLowercase) chars += lowercase;
  if (includeUppercase) chars += uppercase;
  if (includeNumbers) chars += numbers;
  if (includeSymbols) chars += symbols;

  // Ensure at least one character set is selected
  if (!chars) chars = lowercase;

  // Generate password
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    password += chars[randomIndex];
  }

  // Ensure password contains at least one character from each selected set
  if (includeUppercase && !password.match(/[A-Z]/)) {
    const pos = Math.floor(Math.random() * length);
    password = password.substring(0, pos) + 
      uppercase[Math.floor(Math.random() * uppercase.length)] + 
      password.substring(pos + 1);
  }
  if (includeLowercase && !password.match(/[a-z]/)) {
    const pos = Math.floor(Math.random() * length);
    password = password.substring(0, pos) + 
      lowercase[Math.floor(Math.random() * lowercase.length)] + 
      password.substring(pos + 1);
  }
  if (includeNumbers && !password.match(/[0-9]/)) {
    const pos = Math.floor(Math.random() * length);
    password = password.substring(0, pos) + 
      numbers[Math.floor(Math.random() * numbers.length)] + 
      password.substring(pos + 1);
  }
  if (includeSymbols && !password.match(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/)) {
    const pos = Math.floor(Math.random() * length);
    password = password.substring(0, pos) + 
      symbols[Math.floor(Math.random() * symbols.length)] + 
      password.substring(pos + 1);
  }

  return password;
} 