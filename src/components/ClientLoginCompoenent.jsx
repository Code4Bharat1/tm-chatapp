"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, MessageCircle, AlertCircle, Users, Zap, Shield } from "lucide-react";
import { compact } from "lodash";

const LoginComponent = ({
  onLogin,
  loginRoute = `${process.env.NEXT_PUBLIC_BACKEND_API}/admin/client/login`,
  redirectUrl = "/chat",
  title = "Welcome to ChatApp",
  subtitle = "Connect with friends and start conversations",
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

        console.log(data)
        // ✅ Save token from response to localStorage
      if (data.clientToken) {
        // console.log(data.admintoken)
        localStorage.setItem('clientToken', data.clientToken);
      }

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

  const features = [
    { icon: Users, text: "Connect with your people" },
    { icon: Zap, text: "Lightning-fast messaging and file sharing" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Side - Branding and Features */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-blue-500"></div>
          <div className="absolute top-40 right-20 w-24 h-24 rounded-full bg-purple-500"></div>
          <div className="absolute bottom-20 left-20 w-40 h-40 rounded-full bg-green-500"></div>
          <div className="absolute bottom-40 right-10 w-20 h-20 rounded-full bg-yellow-500"></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <MessageCircle className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold">ChatApp</h1>
          </div>
          
          <div className="mb-12">
            <h2 className="text-4xl font-bold mb-4 leading-tight">
              Stay connected with your world
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed">
              Join for secure, fast, and reliable messaging.
            </p>
          </div>

          <div className="space-y-6">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
                  <feature.icon className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-slate-300">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Bubbles Animation */}
        <div className="relative z-10">
          <div className="space-y-3">
            <div className="bg-blue-600 rounded-2xl rounded-bl-md p-3 max-w-xs">
              <p className="text-sm">Hey! How are you doing?</p>
            </div>
            <div className="bg-slate-700 rounded-2xl rounded-br-md p-3 max-w-xs ml-auto">
              <p className="text-sm">Great! Just joined ChatApp 🎉</p>
            </div>
            <div className="bg-blue-600 rounded-2xl rounded-bl-md p-3 max-w-xs">
              <p className="text-sm">Awesome! Welcome to the community!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">ChatApp</h1>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              {isSignUp ? "Join ChatApp" : "Welcome back"}
            </h2>
            <p className="text-slate-600">
              {isSignUp ? "Create your account to get started" : "Sign in to continue your conversations"}
            </p>
          </div>

          {/* Login Form */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Email Field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 duration-200 bg-slate-50 focus:bg-white"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-12 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 transition-all duration-200 bg-slate-50 focus:bg-white"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
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

              {/* Remember Me & Forgot Password */}
              {!isSignUp && (
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium"
                    onClick={() => alert("Forgot password functionality can be added here")}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !formData.email || !formData.password}
                className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                  isLoading || !formData.email || !formData.password
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
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

            </form>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginComponent;