import axios from 'axios';

export default axios.create({
  baseURL: import.meta.env.API_URL || 'hermyxbackend-hqb3bffcbbf7arbq.spaincentral-01.azurewebsites.net' || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  // Ten seconds of maximum wait until timeout
  timeout: 10000,
});
