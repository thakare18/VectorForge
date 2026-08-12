export const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const validatePassword = (password) => {
  const errors = [];
  if (password.length < 8) errors.push("At least 8 characters");
  if (!/[A-Z]/.test(password)) errors.push("One uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("One lowercase letter");
  if (!/[0-9]/.test(password)) errors.push("One number");
  return errors;
};

export const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: "Empty" };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const labels = ["Weak", "Fair", "Good", "Strong", "Very Strong"];
  return { score, label: labels[Math.min(score, labels.length - 1)] };
};

export const validatePdfFile = (file, maxSizeMb = 10) => {
  if (!file) return "No file selected";
  if (file.type !== "application/pdf") return "Only PDF files are allowed";
  if (file.size > maxSizeMb * 1024 * 1024) {
    return `File must be under ${maxSizeMb}MB`;
  }
  return null;
};
