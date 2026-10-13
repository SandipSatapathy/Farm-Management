// Netlify Serverless Function: Payroll Preview
// Complies with 07_API_AND_INTEGRATIONS.md and 03_TECHNICAL_REQUIREMENTS.md

import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST' } }),
    };
  }

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Missing Authorization header' } }),
      };
    }

    const payload = JSON.parse(event.body || '{}');
    const { farmId, periodStart, periodEnd } = payload;

    if (!farmId || !periodStart || !periodEnd) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: 'Missing farmId, periodStart, or periodEnd' } }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        farmId,
        period: { start: periodStart, end: periodEnd },
        status: 'preview',
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: { code: 'SERVER_ERROR', message: err.message || 'Internal error' } }),
    };
  }
};
