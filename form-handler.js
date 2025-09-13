export default {
  async fetch(request, env) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': 'https://akademos.md',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        }
      });
    }

    // Set CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://akademos.md',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Only handle POST requests
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: corsHeaders
      });
    }

    try {
      // Parse the form data
      const formData = await request.formData();
      let name = formData.get('name') || '';
      let company = formData.get('company') || '';
      let email = formData.get('email') || '';
      let phone = formData.get('phone') || '';
      let country = formData.get('country') || '';
      let interest = formData.get('interest') || '';
      let message = formData.get('message') || '';

      // Input sanitization and validation
      name = name.trim().slice(0, 100); // Trim and limit length
      company = company.trim().slice(0, 100);
      email = email.trim().toLowerCase().slice(0, 100);
      phone = phone.trim().slice(0, 20);
      country = country.trim().slice(0, 50);
      interest = interest.trim().slice(0, 50);
      message = message.trim().slice(0, 1000);

      // Validate required fields
      if (!name || !email || !country) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Missing required fields' 
        }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders // Using spread operator for consistency 
          }
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Invalid email format' 
        }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // Insert into D1 database
      const { success } = await env.DB.prepare(`
        INSERT INTO contacts (name, company, email, phone, country, interest, message, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(name, company, email, phone, country, interest, message).run();

      if (success) {
        // Return JSON success response
        return new Response(JSON.stringify({ 
          success: true,
          message: 'Thank you! We will contact you shortly.' 
        }), {
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      } else {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Database error' 
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

    } catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }
}