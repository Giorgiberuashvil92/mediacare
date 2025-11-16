import { cookies, headers } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function getOverviewData() {
  try {
    // Get token from cookies (server-side)
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;

    if (!token) {
      throw new Error('No token provided');
    }

    // Get headers to forward cookies
    const headersList = await headers();
    const response = await fetch(`${API_BASE_URL}/admin/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Cookie': headersList.get('cookie') || '',
      },
      cache: 'no-store', // Ensure fresh data on each request
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success && data.data) {
      const { overview, doctors } = data.data;
      
      // Calculate growth rate (mock for now, can be improved with historical data)
      const calculateGrowthRate = (current: number) => {
        // Mock growth rate calculation - can be replaced with real historical comparison
        return current > 0 ? (Math.random() * 5 - 2.5) : 0;
      };

      return {
        users: {
          value: overview.totalUsers || 0,
          growthRate: calculateGrowthRate(overview.totalUsers || 0),
        },
        patients: {
          value: overview.totalPatients || 0,
          growthRate: calculateGrowthRate(overview.totalPatients || 0),
        },
        doctors: {
          value: overview.totalDoctors || 0,
          growthRate: calculateGrowthRate(overview.totalDoctors || 0),
        },
        pendingDoctors: {
          value: doctors.pending || 0,
          growthRate: calculateGrowthRate(doctors.pending || 0),
        },
      };
    }
  } catch (error) {
    console.error('Failed to fetch overview data:', error);
  }

  // Fallback to default values if API fails
  return {
    users: {
      value: 0,
      growthRate: 0,
    },
    patients: {
      value: 0,
      growthRate: 0,
    },
    doctors: {
      value: 0,
      growthRate: 0,
    },
    pendingDoctors: {
      value: 0,
      growthRate: 0,
    },
  };
}

export async function getChatsData() {
  // Fake delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return [
    {
      name: "Jacob Jones",
      profile: "/images/user/user-01.png",
      isActive: true,
      lastMessage: {
        content: "See you tomorrow at the meeting!",
        type: "text",
        timestamp: "2024-12-19T14:30:00Z",
        isRead: false,
      },
      unreadCount: 3,
    },
    {
      name: "Wilium Smith",
      profile: "/images/user/user-03.png",
      isActive: true,
      lastMessage: {
        content: "Thanks for the update",
        type: "text",
        timestamp: "2024-12-19T10:15:00Z",
        isRead: true,
      },
      unreadCount: 0,
    },
    {
      name: "Johurul Haque",
      profile: "/images/user/user-04.png",
      isActive: false,
      lastMessage: {
        content: "What's up?",
        type: "text",
        timestamp: "2024-12-19T10:15:00Z",
        isRead: true,
      },
      unreadCount: 0,
    },
    {
      name: "M. Chowdhury",
      profile: "/images/user/user-05.png",
      isActive: false,
      lastMessage: {
        content: "Where are you now?",
        type: "text",
        timestamp: "2024-12-19T10:15:00Z",
        isRead: true,
      },
      unreadCount: 2,
    },
    {
      name: "Akagami",
      profile: "/images/user/user-07.png",
      isActive: false,
      lastMessage: {
        content: "Hey, how are you?",
        type: "text",
        timestamp: "2024-12-19T10:15:00Z",
        isRead: true,
      },
      unreadCount: 0,
    },
  ];
}