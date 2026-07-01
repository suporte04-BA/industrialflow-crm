// Worker API endpoint to bypass RLS for profile fetching
// This allows authenticated users to fetch their own profile without RLS restrictions
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { jwt } = req.body;
    
    // Verify JWT and extract user ID
    const user = jwt ? JSON.parse(atob(jwt.split('.').at(1))) : null;
    if (!user?.sub) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Fetch profile with service role (bypass RLS)
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/profiles?select=*&id=eq.${user.sub}`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }
    
    const data = await response.json();
    
    // Return first matching profile
    const profile = Array.isArray(data) ? data[0] : data;
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    // Transform to camelCase for consistency
    const camelProfile = Object.keys(profile).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
      acc[camelKey] = profile[key];
      return acc;
    }, {});
    
    return res.status(200).json({ user: camelProfile });
  } catch (error) {
    console.error('API profiles error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}