"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { socket } from "@/utils/socket";

const Schema = z.object({
    email: z.email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
});

type FormValues = z.infer<typeof Schema>;

export default function LoginForm() {

    const [rememberMe, setRememberMe] = useState(false);
    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
        resolver: zodResolver(Schema),
    });

    const router = useRouter();

    const mutateFunction = async (data: FormValues) => {
        const response = await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}/api/login`, { ...data, rememberMe }, { withCredentials: true });

        console.log("responseData>>>", response.data);
        return response.data;
    };

    const mutation = useMutation({
        mutationFn: mutateFunction,
        onSuccess: (data: any) => {
            console.log(data);
            alert(data?.message);
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.data));

            if (!socket.connected) {
                socket.connect();
            }
            socket.emit("register_user", data.data.userId);

            if (data.token) {
                router.push("/profile");
            }
            
        },
        onError: (error: any) => {
            console.log(error);
            alert(error?.response?.data?.message || "Login failed. Please try again.");
        }
    });

    const onSubmit = async (data: FormValues) => {
        mutation.mutate(data);
        reset();
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">Welcome Back</h1>
                    <p className="text-slate-500 font-medium">Login to your account</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    {/* Email Field */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                            Email Address
                        </label>
                        <input
                            type="email"
                            {...register("email")}
                            placeholder="john@example.com"
                            className={`w-full px-4 py-3 rounded-lg border outline-none transition-all text-slate-900 ${errors.email
                                    ? "border-red-400 focus:ring-2 focus:ring-red-100"
                                    : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                }`}
                        />
                        {errors.email && (
                            <p className="text-red-500 text-xs mt-1 font-medium">{errors.email.message}</p>
                        )}
                    </div>

                    {/* Password Field */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                            Password
                        </label>
                        <input
                            type="password"
                            {...register("password")}
                            placeholder="••••••••"
                            className={`w-full px-4 py-3 rounded-lg border outline-none transition-all text-slate-900 ${errors.password
                                    ? "border-red-400 focus:ring-2 focus:ring-red-100"
                                    : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                }`}
                        />
                        {errors.password && (
                            <p className="text-red-500 text-xs mt-1 font-medium">{errors.password.message}</p>
                        )}
                    </div>
                    <div className="flex items-center">
                        <input
                            id="remember-me"
                            type="checkbox"
                            checked={rememberMe}
                            onChange={() => setRememberMe(!rememberMe)}
                            className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <label
                            htmlFor="remember-me"
                            className="ml-2 block text-sm font-medium text-slate-600 cursor-pointer select-none"
                        >
                            Remember me
                        </label>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting || mutation.isPending}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                    >
                        {isSubmitting || mutation.isPending ? "Signing in..." : "Sign In"}
                    </button>

                    {/* Link to Signup */}
                    <p className="text-center text-sm text-slate-500 mt-4">
                        Don&apos;t have an account?{" "}
                        <a href="/signup" className="text-blue-600 font-semibold hover:underline">
                            Create one
                        </a>
                    </p>
                </form>

            </div>
        </div>
    );
}