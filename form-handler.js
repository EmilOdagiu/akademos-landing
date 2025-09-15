// Rate limiting configuration
const RATE_LIMIT = {
  MAX_REQUESTS: 5,    // Requests per window
  WINDOW_SECONDS: 60, // Time window in seconds
};

// CAPTCHA verification function
async function verifyCaptcha(captchaResponse, secretKey, siteKey) {
  const formData = new FormData();
  formData.append('response', captchaResponse);
  formData.append('secret', secretKey);
  formData.append('sitekey', siteKey);
  
  const response = await fetch('https://hcaptcha.com/siteverify', {
    method: 'POST',
    body: formData
  });
  
  const data = await response.json();
  return data.success;
}

async function checkRateLimit(request, env) {
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
  const key = `rate_limit:${clientIP}`;
  
  // Get current count
  let count = await env.RATE_LIMIT_KV.get(key);
  count = count ? parseInt(count) : 0;
  
  // Check if over limit
  if (count >= RATE_LIMIT.MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }
  
  // Increment count
  await env.RATE_LIMIT_KV.put(key, (count + 1).toString(), {
    expirationTtl: RATE_LIMIT.WINDOW_SECONDS
  });
  
  return { allowed: true, remaining: RATE_LIMIT.MAX_REQUESTS - count - 1 };
}

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

    // Rate limiting check
    const rateLimit = await checkRateLimit(request, env);
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Too many requests. Please try again later.' 
      }), {
        status: 429,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders,
          'Retry-After': RATE_LIMIT.WINDOW_SECONDS.toString()
        }
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
      let captchaResponse = formData.get('h-captcha-response') || '';

      // Verify CAPTCHA
      const isCaptchaValid = await verifyCaptcha(
        captchaResponse, 
        env.HCAPTCHA_SECRET, 
        env.HCAPTCHA_SITE_KEY
      );

      if (!isCaptchaValid) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'CAPTCHA verification failed' 
        }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // Input sanitization and validation
      name = name.trim().slice(0, 100);
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
            ...corsHeaders
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