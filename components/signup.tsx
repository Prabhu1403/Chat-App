import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import { socket } from "@/utils/socket";

const Schema = z.object({
    name: z.string().min(1, "Name is required").regex(/^[A-Za-z ]+$/, "Name must contain only letters and spaces"),
    phone: z.string().min(10, "Phone number must be at least 10 digits long"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
    confirmPassword: z.string().min(6, "Confirm Password must be at least 6 characters long"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

type FormValues = z.infer<typeof Schema>;

export default function Form() {
    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
        resolver: zodResolver(Schema),
    });

    const router = useRouter();

    const mutateFunction = async (data: FormValues & { userId: string }) => {
        const response = await axios.post("http://localhost:8000/api/signup", data);
        console.log("responceData>>>", response.data);
        return response.data;
    }


    
    const mutation = useMutation({
        mutationFn: mutateFunction,
        onSuccess: (data: any) => {
            console.log(data);
            alert(data?.message);
            //set token in local storage
            localStorage.setItem("token", data.token);
            //set user in local storage
            localStorage.setItem("user", JSON.stringify(data.data));

            // Emit register_user to notify backend that this user is online
            if (!socket.connected) {
                socket.connect();
            }
            // socket.emit("register_user", data.data.userId);

            if(data.token)
            {
                router.push("/profile");
            }
            
        },
        onError: (error: any) => {
            console.log(error);
            alert(error?.response?.data?.message);
            
        }
    });

    const onsubmit = async (data: FormValues) => {
        const userId = "USER-" + Math.floor(100000 + Math.random() * 900000);
        console.log(data);
        mutation.mutate({ ...data, userId });
        reset();
    };


    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">Create Account</h1>
                    <p className="text-slate-500 font-medium">Please fill in your details below</p>
                </div>

                <form onSubmit={handleSubmit(onsubmit)} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                        <input 
                            {...register("name")}
                            placeholder="John Doe"
                            className={`w-full px-4 py-3 rounded-lg border outline-none transition-all text-slate-900 ${
                                errors.name ? 'border-red-400 focus:ring-2 focus:ring-red-100' : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                            }`}
                        />
                        {errors.name && <p className="text-red-500 text-xs mt-1 font-medium">{errors.name.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number</label>
                        <input 
                            type="tel"
                            {...register("phone")}
                            placeholder="1234567890"
                            className={`w-full px-4 py-3 rounded-lg border outline-none transition-all text-slate-900 ${
                                errors.phone ? 'border-red-400 focus:ring-2 focus:ring-red-100' : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                            }`}
                        />
                        {errors.phone && <p className="text-red-500 text-xs mt-1 font-medium">{errors.phone.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                        <input 
                            type="email"
                            {...register("email")}
                            placeholder="john@example.com"
                            className={`w-full px-4 py-3 rounded-lg border outline-none transition-all text-slate-900 ${
                                errors.email ? 'border-red-400 focus:ring-2 focus:ring-red-100' : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                            }`}
                        />
                        {errors.email && <p className="text-red-500 text-xs mt-1 font-medium">{errors.email.message}</p>}
                    </div>

                    <div className="grid grid-cols-1 gap-5">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
                            <input 
                                type="password"
                                {...register("password")}
                                placeholder="••••••••"
                                className={`w-full px-4 py-3 rounded-lg border outline-none transition-all text-slate-900 ${
                                    errors.password ? 'border-red-400 focus:ring-2 focus:ring-red-100' : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                                }`}
                            />
                            {errors.password && <p className="text-red-500 text-xs mt-1 font-medium">{errors.password.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Confirm Password</label>
                            <input 
                                type="password"
                                {...register("confirmPassword")}
                                placeholder="••••••••"
                                className={`w-full px-4 py-3 rounded-lg border outline-none transition-all text-slate-900 ${
                                    errors.confirmPassword ? 'border-red-400 focus:ring-2 focus:ring-red-100' : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                                }`}
                            />
                            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1 font-medium">{errors.confirmPassword.message}</p>}
                        </div>
                    </div>


                   <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                    >
                        {isSubmitting ? 'Submitting...' : 'Create Account'}
                    </button>
                    <p className="text-center text-sm text-slate-500 mt-4">
                        Already have an account?{" "}
                        <a href="/login" className="text-blue-600 font-semibold hover:underline">
                            Login
                        </a>
                    </p>
                </form>
            </div>
        </div>
    );
}