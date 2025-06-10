// api/degrees.js
import axios from 'axios';
const API = import.meta.env.VITE_API_URL;

export const getDegrees = () => axios.get(`${API}/degrees`);
