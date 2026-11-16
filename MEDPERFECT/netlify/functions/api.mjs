/**
 * Netlify Function: MEDAI API (/api/* -> /.netlify/functions/api/*).
 * Express API ilovasi serverless-http orqali ishga tushiriladi.
 * API kaliti Netlify sayt sozlamalaridagi muhit o'zgaruvchisidan (ANTHROPIC_API_KEY) o'qiladi.
 */
import serverless from 'serverless-http';
import { createApiApp } from '../../server/api.js';

export const handler = serverless(createApiApp());
