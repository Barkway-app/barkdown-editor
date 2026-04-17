import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [vue()],
    test: {
        environment: 'jsdom',
        include: ['src/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
            include: ['src/**/*.{ts,vue}'],
            exclude: ['src/**/*.test.ts', 'src/**/*.d.ts'],
        },
    },
    build: {
        lib: {
            entry: 'src/index.ts',
            name: 'Barkdown',
            formats: ['es', 'cjs'],
            fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
            cssFileName: 'style',
        },
        sourcemap: true,
        rollupOptions: {
            external: ['vue', 'lucide'],
        },
    },
});
