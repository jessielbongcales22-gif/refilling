import React, { useState } from "react";
import axios from "axios";
import {
  Droplets,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  MapPin,
  Clock,
  ShoppingCart,
  Users,
  X,
  Info,
  User,
  Phone,
  Home,
} from "lucide-react";

interface AuthPageProps {
  onLogin: () => void;
}

type AuthTab = "signin" | "signup";

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<AuthTab>("signin");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerAddress, setRegisterAddress] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const openSignIn = () => {
    setActiveTab("signin");
    setMessage("");
    setShowModal(true);
  };

  const openCreateAccount = () => {
    setActiveTab("signup");
    setMessage("");
    setShowModal(true);
  };

  const fillDemo = (type: "admin" | "staff") => {
    if (type === "admin") {
      setLoginEmail("admin@watermarket.com");
      setLoginPassword("admin123");
    } else {
      setLoginEmail("staff1@watermarket.com");
      setLoginPassword("staff123");
    }

    setActiveTab("signin");
    setMessage("");
  };

  const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setMessage("");

  if (!loginEmail.trim() || !loginPassword.trim()) {
    setMessage("Please enter your email and password.");
    return;
  }

  try {
    setLoading(true);

    const response = await axios.post("/api/login", {
      email: loginEmail.trim(),
      username: loginEmail.trim(),
      password: loginPassword
    });

    console.log("LOGIN RESPONSE:", response.data);

    if (response.data && response.data.success === true) {
      localStorage.setItem("water_market_token", response.data.token);
      localStorage.setItem("water_market_user", JSON.stringify(response.data.user));
      localStorage.setItem("isLoggedIn", "true");

      setMessage("");
      setShowModal(false);

      onLogin();

      // Force the app to refresh into the dashboard state
      window.location.reload();
    } else {
      setMessage(response.data?.message || "Invalid login credentials.");
    }
  } catch (error: any) {
    console.error("Login error:", error);

    setMessage(
      error.response?.data?.message ||
        "Server error during login. Please check your database connection."
    );
  } finally {
    setLoading(false);
  }
};

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (
      !registerName.trim() ||
      !registerEmail.trim() ||
      !registerPhone.trim() ||
      !registerAddress.trim() ||
      !registerPassword.trim()
    ) {
      setMessage("Please complete all required fields.");
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post("/api/register", {
        username: registerName.trim(),
        email: registerEmail.trim(),
        phone: registerPhone.trim(),
        address: registerAddress.trim(),
        password: registerPassword,
        role: "customer",
      });

      if (response.data?.success) {
        setMessage("Account created successfully. You can now sign in.");
        setActiveTab("signin");

        setLoginEmail(registerEmail);
        setLoginPassword("");

        setRegisterName("");
        setRegisterEmail("");
        setRegisterPhone("");
        setRegisterAddress("");
        setRegisterPassword("");
        setRegisterConfirmPassword("");
      } else {
        setMessage(response.data?.message || "Account creation failed.");
      }
    } catch (error: any) {
      setMessage(
        error.response?.data?.message ||
          "Create account is not connected yet. Add /api/register in server.js."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="fixed left-0 top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-lg">
              <Droplets size={25} />
            </div>

            <div>
              <h1 className="text-lg font-extrabold leading-none text-slate-900">
                Water Market Station
              </h1>
              <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                Hinunangan, Southern Leyte
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={openSignIn}
              className="font-semibold text-blue-600 transition hover:text-blue-700"
            >
              Sign In
            </button>

            <button
              onClick={openCreateAccount}
              className="rounded-xl bg-blue-600 px-7 py-3 font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700"
            >
              Create Account
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="pt-24">
        <section className="mx-auto grid min-h-[620px] max-w-7xl grid-cols-1 items-center gap-10 px-6 py-16 lg:grid-cols-2">
          <div>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-5 py-3 font-semibold text-blue-700">
              <Shield size={18} />
              Trusted Water Refilling Station in Hinunangan
            </div>

            <h2 className="max-w-xl text-6xl font-black leading-tight tracking-tight text-slate-950 md:text-7xl">
              Water Market{" "}
              <span className="block text-blue-600">Station</span>
            </h2>

            <p className="mt-8 max-w-2xl text-xl leading-relaxed text-slate-600">
              Your reliable source of clean, safe, and affordable purified water
              in{" "}
              <span className="font-bold text-slate-900">
                Hinunangan, Southern Leyte.
              </span>{" "}
              We serve the community with quality water refills delivered right
              to your doorstep.
            </p>

            <div className="mt-10 max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
              <div className="flex gap-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-600">
                  <MapPin size={24} />
                </div>

                <div>
                  <h3 className="font-bold text-slate-900">Station Address</h3>
                  <p className="mt-1 text-slate-600">
                    Purok Saging, Brgy. Panalaron,{" "}
                    <span className="font-semibold text-blue-600">
                      Hinunangan, Southern Leyte
                    </span>
                  </p>
                </div>
              </div>

              <div className="my-6 border-t border-slate-200" />

              <div className="flex gap-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <Clock size={24} />
                </div>

                <div>
                  <h3 className="font-bold text-slate-900">Operating Hours</h3>
                  <p className="mt-1 text-slate-600">
                    Monday–Saturday: 7:00 AM – 6:00 PM
                  </p>
                  <p className="text-slate-400">Sunday: Closed</p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              <button
                onClick={openCreateAccount}
                className="rounded-xl bg-blue-600 px-8 py-4 font-bold text-white shadow-xl shadow-blue-600/20 transition hover:bg-blue-700"
              >
                Order Water Now
              </button>

              <button
                onClick={openSignIn}
                className="rounded-xl border border-slate-300 bg-white px-8 py-4 font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Sign In to Account
              </button>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="relative mx-auto h-[520px] max-w-md rounded-[2rem] bg-gradient-to-br from-blue-100 via-sky-50 to-white p-8 shadow-2xl">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-blue-500/20 blur-3xl" />
              <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-sky-400/20 blur-3xl" />

              <div className="relative flex h-full flex-col justify-center rounded-[1.5rem] border border-white bg-white/80 p-8 shadow-lg backdrop-blur">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-xl">
                  <Droplets size={50} />
                </div>

                <h3 className="mt-8 text-center text-3xl font-black text-slate-900">
                  Clean Water, Easy Ordering
                </h3>

                <p className="mt-4 text-center text-slate-600">
                  Manage orders, track deliveries, and serve customers through
                  one simple system.
                </p>

                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-blue-50 p-5 text-center">
                    <p className="text-3xl font-black text-blue-600">₱30</p>
                    <p className="mt-1 text-sm text-slate-500">Per refill</p>
                  </div>

                  <div className="rounded-2xl bg-green-50 p-5 text-center">
                    <p className="text-3xl font-black text-green-600">Safe</p>
                    <p className="mt-1 text-sm text-slate-500">Filtered</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Offers */}
        <section className="border-y border-slate-200 bg-blue-50 py-20">
          <div className="mx-auto max-w-5xl px-6">
            <div className="text-center">
              <h2 className="text-4xl font-black text-slate-950">
                What We Offer
              </h2>
              <p className="mt-4 text-lg text-slate-500">
                Clean water services for your home and business
              </p>
            </div>

            <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-md">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-lg">
                  <Droplets size={34} />
                </div>
                <h3 className="mt-7 text-xl font-black">Purified Water</h3>
                <p className="mt-3 text-slate-600">
                  High-quality purified water refill at ₱30 per container
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-md">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg">
                  <ShoppingCart size={34} />
                </div>
                <h3 className="mt-7 text-xl font-black">Online Ordering</h3>
                <p className="mt-3 text-slate-600">
                  Order water delivery from the comfort of your home
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-md">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg">
                  <Users size={34} />
                </div>
                <h3 className="mt-7 text-xl font-black">Walk-in Service</h3>
                <p className="mt-3 text-slate-600">
                  Visit our station anytime during operating hours
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-md">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg">
                  <Shield size={34} />
                </div>
                <h3 className="mt-7 text-xl font-black">Safe & Clean</h3>
                <p className="mt-3 text-slate-600">
                  Filtered and tested water you can trust for your family
                </p>
              </div>
            </div>
          </div>
        </section>

        <footer className="py-8 text-center text-slate-400">
          © 2025 Water Market Water Refilling Station · Hinunangan, Southern
          Leyte
        </footer>
      </main>

      {/* Auth Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm">
          <div className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-8">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-white">
                  <Droplets size={23} />
                </div>

                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    Water Market Station
                  </h2>
                  <p className="text-sm text-slate-400">
                    Hinunangan, Southern Leyte
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8">
              <div className="mb-8 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
                <button
                  onClick={() => {
                    setActiveTab("signin");
                    setMessage("");
                  }}
                  className={`rounded-xl py-3 font-bold transition ${
                    activeTab === "signin"
                      ? "bg-white text-blue-600 shadow"
                      : "text-slate-500"
                  }`}
                >
                  Sign In
                </button>

                <button
                  onClick={() => {
                    setActiveTab("signup");
                    setMessage("");
                  }}
                  className={`rounded-xl py-3 font-bold transition ${
                    activeTab === "signup"
                      ? "bg-white text-blue-600 shadow"
                      : "text-slate-500"
                  }`}
                >
                  Create Account
                </button>
              </div>

              {message && (
                <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
                  {message}
                </div>
              )}

              {activeTab === "signin" ? (
                <form onSubmit={handleLogin}>
                  <div className="space-y-5">
                    <div>
                      <label className="mb-2 block font-bold text-slate-700">
                        Email Address
                      </label>

                      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 focus-within:border-blue-500 focus-within:bg-white">
                        <Mail className="text-slate-400" size={21} />
                        <input
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          type="email"
                          placeholder="you@example.com"
                          className="w-full bg-transparent outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block font-bold text-slate-700">
                        Password
                      </label>

                      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 focus-within:border-blue-500 focus-within:bg-white">
                        <Lock className="text-slate-400" size={21} />
                        <input
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          type={showLoginPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          className="w-full bg-transparent outline-none"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowLoginPassword(!showLoginPassword)
                          }
                          className="text-slate-400"
                        >
                          {showLoginPassword ? (
                            <EyeOff size={21} />
                          ) : (
                            <Eye size={21} />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      disabled={loading}
                      type="submit"
                      className="flex w-full items-center justify-center gap-3 rounded-xl bg-blue-600 py-4 text-lg font-black text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-60"
                    >
                      {loading ? "Signing In..." : "Sign In"}
                      {!loading && <ArrowRight size={21} />}
                    </button>

                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
                      <div className="mb-4 flex items-center gap-2 font-black text-blue-700">
                        <Info size={18} />
                        Demo Credentials — click to auto-fill
                      </div>

                      <button
                        type="button"
                        onClick={() => fillDemo("admin")}
                        className="mb-3 flex w-full items-center justify-between rounded-lg bg-white px-4 py-3 text-left transition hover:bg-blue-50"
                      >
                        <span>
                          <span className="mr-3 rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700">
                            Admin
                          </span>
                          <span className="font-mono text-sm text-slate-600">
                            admin@watermarket.com
                          </span>
                        </span>
                        <ArrowRight size={16} className="text-slate-300" />
                      </button>

                      <button
                        type="button"
                        onClick={() => fillDemo("staff")}
                        className="flex w-full items-center justify-between rounded-lg bg-white px-4 py-3 text-left transition hover:bg-blue-50"
                      >
                        <span>
                          <span className="mr-3 rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-700">
                            Staff
                          </span>
                          <span className="font-mono text-sm text-slate-600">
                            staff1@watermarket.com
                          </span>
                        </span>
                        <ArrowRight size={16} className="text-slate-300" />
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleRegister}>
                  <div className="space-y-5">
                    <div>
                      <label className="mb-2 block font-bold text-slate-700">
                        Full Name
                      </label>

                      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 focus-within:border-blue-500 focus-within:bg-white">
                        <User className="text-slate-400" size={21} />
                        <input
                          value={registerName}
                          onChange={(e) => setRegisterName(e.target.value)}
                          type="text"
                          placeholder="Juan Dela Cruz"
                          className="w-full bg-transparent outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block font-bold text-slate-700">
                        Email Address
                      </label>

                      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 focus-within:border-blue-500 focus-within:bg-white">
                        <Mail className="text-slate-400" size={21} />
                        <input
                          value={registerEmail}
                          onChange={(e) => setRegisterEmail(e.target.value)}
                          type="email"
                          placeholder="you@example.com"
                          className="w-full bg-transparent outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block font-bold text-slate-700">
                        Phone Number
                      </label>

                      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 focus-within:border-blue-500 focus-within:bg-white">
                        <Phone className="text-slate-400" size={21} />
                        <input
                          value={registerPhone}
                          onChange={(e) => setRegisterPhone(e.target.value)}
                          type="text"
                          placeholder="09XXXXXXXXX"
                          className="w-full bg-transparent outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block font-bold text-slate-700">
                        Address
                      </label>

                      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 focus-within:border-blue-500 focus-within:bg-white">
                        <Home className="text-slate-400" size={21} />
                        <input
                          value={registerAddress}
                          onChange={(e) => setRegisterAddress(e.target.value)}
                          type="text"
                          placeholder="Your address in Hinunangan"
                          className="w-full bg-transparent outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block font-bold text-slate-700">
                        Password
                      </label>

                      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 focus-within:border-blue-500 focus-within:bg-white">
                        <Lock className="text-slate-400" size={21} />
                        <input
                          value={registerPassword}
                          onChange={(e) =>
                            setRegisterPassword(e.target.value)
                          }
                          type={showRegisterPassword ? "text" : "password"}
                          placeholder="Create password"
                          className="w-full bg-transparent outline-none"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowRegisterPassword(!showRegisterPassword)
                          }
                          className="text-slate-400"
                        >
                          {showRegisterPassword ? (
                            <EyeOff size={21} />
                          ) : (
                            <Eye size={21} />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block font-bold text-slate-700">
                        Confirm Password
                      </label>

                      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 focus-within:border-blue-500 focus-within:bg-white">
                        <Lock className="text-slate-400" size={21} />
                        <input
                          value={registerConfirmPassword}
                          onChange={(e) =>
                            setRegisterConfirmPassword(e.target.value)
                          }
                          type="password"
                          placeholder="Confirm password"
                          className="w-full bg-transparent outline-none"
                        />
                      </div>
                    </div>

                    <button
                      disabled={loading}
                      type="submit"
                      className="flex w-full items-center justify-center gap-3 rounded-xl bg-blue-600 py-4 text-lg font-black text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-60"
                    >
                      {loading ? "Creating Account..." : "Create Account"}
                      {!loading && <ArrowRight size={21} />}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthPage;
