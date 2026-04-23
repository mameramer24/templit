import { NextRequest, NextResponse } from "next/server";

/**
 * DEBUG ROUTE
 * Accepts everything to diagnose n8n 405 error
 */
export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    message: "POST Success - If you see this, connectivity is OK",
    method: request.method,
    time: new Date().toISOString()
  });
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: "GET Success - If you see this, connectivity is OK",
    method: request.method,
    time: new Date().toISOString()
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    },
  });
}
