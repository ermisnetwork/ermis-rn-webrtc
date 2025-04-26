import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/ermis-call-react-native-sdk.cjs.js',
      format: 'cjs',
      sourcemap: true,
    },
    {
      file: 'dist/ermis-call-react-native-sdk.esm.js',
      format: 'esm',
      sourcemap: true,
    },
    {
      file: 'dist/index.js',
      format: 'es',
      sourcemap: true,
    },
  ],
  plugins: [resolve(), commonjs(), typescript(), terser()],
  external: ['react-native-webrtc'],
};
