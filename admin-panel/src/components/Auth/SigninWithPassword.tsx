"use client";
import { EmailIcon, PasswordIcon } from "@/assets/icons";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import InputGroup from "../FormElements/InputGroup";
import { Checkbox } from "../FormElements/checkbox";

export default function SigninWithPassword() {
  const [data, setData] = useState({
    email: process.env.NEXT_PUBLIC_DEMO_USER_MAIL || "",
    password: process.env.NEXT_PUBLIC_DEMO_USER_PASS || "",
    remember: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();

  useEffect(() => {
    console.log('📝 [SigninWithPassword] Component mounted!');
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData({
      ...data,
      [e.target.name]: e.target.value,
    });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    console.log('🚀 [Form] handleSubmit called!');
    e.preventDefault();
    console.log('🚀 [Form] preventDefault called, email:', data.email);
    setError(null);
    setLoading(true);

    try {
      console.log('🚀 [Form] Calling login...');
      await login(data.email, data.password);
      console.log('🚀 [Form] Login completed!');
      // router.push is already called inside login function
    } catch (err: any) {
      console.error('🚀 [Form] Login error:', err);
      setError(err.message || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
    // Don't set loading to false on success - page will redirect
  };

  return (
    <form onSubmit={handleSubmit} autoComplete="off">
      <InputGroup
        type="email"
        label="Email"
        className="mb-4 [&_input]:py-[15px]"
        placeholder="Enter your email"
        name="email"
        handleChange={handleChange}
        value={data.email}
        icon={<EmailIcon />}
        autoComplete="email"
      />

      <InputGroup
        type="password"
        label="Password"
        className="mb-5 [&_input]:py-[15px]"
        placeholder="Enter your password"
        name="password"
        handleChange={handleChange}
        value={data.password}
        icon={<PasswordIcon />}
        autoComplete="current-password"
      />

      <div className="mb-6 flex items-center justify-between gap-2 py-2 font-medium">
        <Checkbox
          label="Remember me"
          name="remember"
          withIcon="check"
          minimal
          radius="md"
          onChange={(e) =>
            setData({
              ...data,
              remember: e.target.checked,
            })
          }
        />

        <Link
          href="/auth/forgot-password"
          className="hover:text-primary dark:text-white dark:hover:text-primary"
        >
          Forgot Password?
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="mb-4.5">
        <button
          type="submit"
          disabled={loading}
          onClick={() => console.log('🔘 [Button] Sign In clicked!')}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary p-4 font-medium text-white transition hover:bg-opacity-90 disabled:opacity-50"
        >
          Sign In
          {loading && (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-t-transparent dark:border-primary dark:border-t-transparent" />
          )}
        </button>
      </div>
    </form>
  );
}
