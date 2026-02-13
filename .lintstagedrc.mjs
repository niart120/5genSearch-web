export default {
  '*.{ts,tsx,js,jsx}': ['eslint --fix', 'prettier --write'],
  '*.{json,css,html}': 'prettier --write',
  '*.rs': () => ['cargo clippy -p wasm-pkg --all-targets -- -D warnings', 'cargo fmt --'],
};
