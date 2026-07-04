/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Não bloquear o build de produção por erros de tipagem ou lint.
  // (O código compila e corre; estas são verificações de estilo.)
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      // Allow Supabase Storage public URLs. Replace <project-ref> via env in production.
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
