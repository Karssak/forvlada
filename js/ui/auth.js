import { apiCall, navigate, setupForm, validateEmail, validateString } from "../core.js";

export function initLoginForm() {
  setupForm("loginForm", async (formData) => {
    const email = formData.get("email")?.trim();
    const password = formData.get("password");
    
    if (!validateEmail(email)) {
      throw new Error("Please enter a valid email address");
    }
    if (!password || password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }
    
    await apiCall("/api/login", "POST", { email, password });
    navigate("/dashboard");
  });
}

export function initRegisterForm() {
  setupForm("registerForm", async (formData) => {
    const data = Object.fromEntries(formData);
    
    // Validate names
    if (!data.firstName?.trim() || data.firstName.trim().length > 100) {
      throw new Error("First name must be 1-100 characters");
    }
    if (!data.lastName?.trim() || data.lastName.trim().length > 100) {
      throw new Error("Last name must be 1-100 characters");
    }
    
    // Validate email
    if (!validateEmail(data.email)) {
      throw new Error("Please enter a valid email address");
    }
    
    // Validate password
    if (!data.password || data.password.length < 6 || data.password.length > 128) {
      throw new Error("Password must be 6-128 characters");
    }
    if (data.password !== data.confirmPassword) {
      throw new Error("Passwords do not match");
    }
    
    await apiCall("/api/register", "POST", data);
    navigate("/dashboard");
  });
}

export function initFamilyForms(onSuccess) {
  setupForm("createFamilyForm", async (formData) => {
    const familyName = formData.get("familyName")?.trim();
    
    if (!validateString(familyName, 1, 200)) {
      throw new Error("Family name must be 1-200 characters");
    }
    
    await apiCall("/api/families", "POST", {
      name: familyName,
      color: "blue",
    });
    if (onSuccess) onSuccess();
  });

  setupForm("joinFamilyForm", async (formData) => {
    const inviteCode = formData.get("inviteCode")?.trim().toUpperCase();
    
    if (!inviteCode || inviteCode.length !== 6 || !/^[A-Z0-9]{6}$/.test(inviteCode)) {
      throw new Error("Invite code must be 6 alphanumeric characters");
    }
    
    await apiCall("/api/families/join", "POST", {
      inviteCode: inviteCode,
      joinRole: formData.get("joinRole") || "parent",
    });
    if (onSuccess) onSuccess();
  });
}
