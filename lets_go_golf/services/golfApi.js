import axios from 'axios'

const API_BASE_URL = 'https://api.golfcourseapi.com' // Replace with actual API base URL
const API_KEY = "3HKTF6JKAN4WIDQ7I7LC5O7Q5Y"

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Authorization': `Key ${API_KEY}`,
        'Content-Type': 'application/json'
    }
})

export const searchCourses = async (query) => {
    try {
      const response = await api.get(`/v1/search`, {
            params: {
                search_query: query,
            },
        })
      console.log("Response Data:", response.data);
      return response.data
    } catch (error) {
      console.error('Error fetching golf courses:', error);
      throw error;
    }
  }