import axios from 'axios';

export default axios.create({
  baseURL:
    import.meta.env.API_URL ||
    'https://hermyxbackend-hqb3bffcbbf7arbq.spaincentral-01.azurewebsites.net',
  headers: {
    'Content-Type': 'application/json',
  },
  // Ten seconds of maximum wait until timeout
  timeout: 10000,
});
