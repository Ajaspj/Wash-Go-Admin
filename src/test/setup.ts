import '@testing-library/jest-dom';

if (!process.env.VITE_API_URL && !process.env.VITE_API_BASE_URL) {
  process.env.VITE_API_URL = 'https://wash-go-api-hsvt.onrender.com';
}
