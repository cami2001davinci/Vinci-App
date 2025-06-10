import axios from 'axios';

const API = import.meta.env.VITE_API_URL;

export const register = (data) => axios.post(`${API}/users/register`, data);
export const login = (data) => axios.post(`${API}/users/login`, data);