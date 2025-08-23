import { Link } from "react-router-dom";

const Login = () => {
    return (
        <div
            className="min-h-screen bg-cover bg-center flex items-center justify-center p-4"
            style={{
                backgroundImage:
                    "url('https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=1470&q=80')",
            }}
        >
            <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-xl shadow-xl p-8 border border-white/20">
                <h2 className="text-3xl font-extrabold text-white mb-6 text-center tracking-wide">
                    Welcome to StudyNest
                </h2>

                <form className="space-y-5">
                    <div>
                        <input
                            type="email"
                            className="w-full px-4 py-3 bg-white/20 text-white border border-white/30 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none placeholder-white/70"
                            placeholder="Email"
                            required
                        />
                    </div>

                    <div>
                        <input
                            type="password"
                            className="w-full px-4 py-3 bg-white/20 text-white border border-white/30 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none placeholder-white/70"
                            placeholder="Password"
                            required
                        />
                    </div>

                    <button
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition-all"
                        type="submit"
                    >
                        Login
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-white">
                    Don’t have an account?{" "}
                    <Link to="/signup" className="text-red-400 hover:underline font-medium">
                        Sign up
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Login;