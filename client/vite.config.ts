import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
function stripCrossorigin(): any {
  return {
    name: 'strip-crossorigin',
    enforce: 'post',
    transformIndexHtml(html: string) {
      return html.replace(/\s+crossorigin(?:="[^"]*")?/g, '');
    },
  };
}

export default defineConfig({
  plugins: [react(), stripCrossorigin()],
  
  // অত্যন্ত গুরুত্বপূর্ণ: এটি অ্যাসেটের পাথগুলোকে রিলেটিভ (./) করে দেয়,
  // যার ফলে ইলেকট্রন বিল্ডের পর file:// প্রোটোকল দিয়ে অ্যাপের স্ক্রিন সঠিকভাবে লোড হতে পারে।
  base: './', 
  
  resolve: {
    alias: {
      // কোডিং করার সময় ইম্পোর্ট পাথ শর্ট করার জন্য '@/' এলিয়াস ডিফাইন করা হয়েছে
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV !== 'production',
    modulePreload: false,
  },
  css: {
    devSourcemap: false,
  },
});