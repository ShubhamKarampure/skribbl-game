import axios from 'axios';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!
const apiClient = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true, 
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
