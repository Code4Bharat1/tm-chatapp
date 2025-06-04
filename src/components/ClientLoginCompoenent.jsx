"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, User, AlertCircle } from "lucide-react";

const LoginComponent = ({
  onLogin,
  loginRoute = "http://localhost:4110/api/admin/client/login",
  redirectUrl = "/chat",
  title = "Welcome Back",
  subtitle = "Sign in to your account to continue",
}) => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Basic validation
      if (!formData.email || !formData.password) {
        throw new Error("Please fill in all fields");
      }
      if (!formData.email.includes("@")) {
        throw new Error("Please enter a valid email address");
      }
      if (formData.password.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }

      // Custom onLogin handler if provided
      if (onLogin) {
        await onLogin(formData);
      } else {
        // Default API call to Next.js API route
        const response = await fetch(loginRoute, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            identifier: formData.email,
            password: formData.password,
            action: isSignUp ? "signup" : "login",
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Authentication failed");
        }

        // Store token if provided
        if (data.token) {
          localStorage.setItem("authToken", data.token);
        }

        // Redirect to the specified URL
        router.push(redirectUrl);
      }
    } catch (err) {
      setError(err.message || "An error occurred during authentication");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setError("");
    setFormData({ email: "", password: "" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isSignUp ? "Create Account" : title}
          </h1>
          <p className="text-gray-600">
            {isSignUp ? "Join our community today" : subtitle}
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Forgot Password */}
            {!isSignUp && (
              <div className="text-right">
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  onClick={() => alert("Forgot password functionality can be added here")}
                >
                  Forgot your password?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !formData.email || !formData.password}
              className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                isLoading || !formData.email || !formData.password
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{isSignUp ? "Creating Account..." : "Signing In..."}</span>
                </div>
              ) : isSignUp ? (
                "Create Account"
              ) : (
                "Sign In"
              )}
            </button>

            {/* Toggle Auth Mode */}
            <div className="text-center pt-4 border-t border-gray-100">
              <p className="text-gray-600">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  type="button"
                  onClick={toggleAuthMode}
                  className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  {isSignUp ? "Sign In" : "Create Account"}
                </button>
              </p>
            </div>
          </form>
        </div>

        {/* Demo Credentials */}
        <div className="mt-6 bg-gray-50 rounded-xl p-4 border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Demo Credentials:</h3>
          <p className="text-sm text-gray-600 mb-1">Email: demo@example.com</p>
          <p className="text-sm text-gray-600">Password: demo123</p>
          <button
            onClick={() => setFormData({ email: "demo@example.com", password: "demo123" })}
            className="mt-2 text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            Click to fill demo credentials
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginComponent;