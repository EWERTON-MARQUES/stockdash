import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const getAllowedOrigins = () => {
  return [
    'https://vwixoidkzaqvuigmeogp.lovableproject.com',
    'https://lovable.dev'
  ];
};

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigins = getAllowedOrigins();
  // Allow any lovable domain or preview domain
  const isAllowed = origin && (
    allowedOrigins.some(o => origin.includes(o.replace('https://', ''))) || 
    origin.includes('lovable') ||
    origin.includes('lovableproject.com')
  );
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
};

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with user's auth token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { apiUrl, apiToken } = await req.json();
    
    if (!apiUrl || !apiToken) {
      return new Response(
        JSON.stringify({ error: 'API URL and Token are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate apiUrl format
    try {
      const url = new URL(apiUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid API URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all products from API to calculate stats
    const allProducts: any[] = [];
    let page = 1;
    const limit = 100;
    let hasMore = true;
    
    while (hasMore && page <= 50) {
      const offset = (page - 1) * limit;
      const response = await fetch(
        `${apiUrl}/catalog?limit=${limit}&offset=${offset}&page=${page}&search=&categoryId=0&suplierId=&brand=&orderBy=id%7Cdesc`,
        {
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch from external API');
      }
      
      const data = await response.json();
      const products = data?.results || data?.data || data?.products || [];
      
      allProducts.push(...products);
      
      if (products.length < limit || allProducts.length >= (data?.total || Infinity)) {
        hasMore = false;
      } else {
        page++;
      }
    }
    
    // Calculate stats
    const totalProducts = allProducts.length;
    const totalStock = allProducts.reduce((acc, p) => acc + (p.availableQuantity || 0), 0);
    const totalValue = allProducts.reduce((acc, p) => acc + ((p.price || 0) * (p.availableQuantity || 0)), 0);
    const lowStockProducts = allProducts.filter(p => (p.availableQuantity || 0) > 0 && (p.availableQuantity || 0) <= 80).length;
    const outOfStockProducts = allProducts.filter(p => (p.availableQuantity || 0) === 0).length;
    
    // Use service role key for database operations
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const today = new Date().toISOString().split('T')[0];
    
    // Upsert snapshot for today
    const { data: snapshot, error } = await supabaseAdmin
      .from('daily_stock_snapshots')
      .upsert({
        date: today,
        total_products: totalProducts,
        total_stock: totalStock,
        total_value: totalValue,
        low_stock_products: lowStockProducts,
        out_of_stock_products: outOfStockProducts,
      }, { onConflict: 'date' })
      .select()
      .single();
    
    if (error) {
      throw new Error('Failed to save snapshot');
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        snapshot,
        stats: {
          totalProducts,
          totalStock,
          totalValue,
          lowStockProducts,
          outOfStockProducts,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const origin = req.headers.get('Origin');
    const corsHeaders = getCorsHeaders(origin);
    return new Response(
      JSON.stringify({ error: 'An error occurred while processing your request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});