/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: { '/api/ai/[task]': ['./data/cache/**/*', './prompts/**/*'] },
};
export default nextConfig;
