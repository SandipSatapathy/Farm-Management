import type { Plugin, ViteDevServer } from 'vite';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export function localPgPlugin(): Plugin {
  let pool: any = null;
  let currentPassword = '';

  const getPool = () => {
    dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });
    const pw = String(process.env.PG_PASSWORD || '').trim();

    if (!pool || pw !== currentPassword) {
      if (pool) {
        try { pool.end(); } catch {}
      }
      currentPassword = pw;
      pool = new Pool({
        host: process.env.PG_HOST || 'localhost',
        port: Number(process.env.PG_PORT) || 5432,
        database: process.env.PG_DATABASE || 'farmlog_dev',
        user: process.env.PG_USER || 'postgres',
        password: pw,
        connectionTimeoutMillis: 3000,
      });
    }
    return pool;
  };

  const tableColumnsCache = new Map<string, Set<string>>();
  const getTableColumns = async (db: any, tableName: string): Promise<Set<string>> => {
    if (tableColumnsCache.has(tableName)) {
      return tableColumnsCache.get(tableName)!;
    }
    try {
      const res = await db.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
        [tableName]
      );
      const cols = new Set<string>(res.rows.map((r: any) => r.column_name));
      if (cols.size > 0) {
        tableColumnsCache.set(tableName, cols);
      }
      return cols;
    } catch {
      return new Set<string>();
    }
  };

  return {
    name: 'vite-plugin-local-pg',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/db')) {
          return next();
        }

        res.setHeader('Content-Type', 'application/json');

        const url = new URL(req.url, `http://${req.headers.host}`);
        const pathname = url.pathname;

        try {
          const db = getPool();

          // Health Check Endpoint
          if (pathname === '/api/db/health') {
            try {
              const result = await db.query(
                `SELECT current_database() as db_name, version() as pg_version, 
                  (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') as table_count`
              );
              return res.end(JSON.stringify({
                ok: true,
                connected: true,
                database: result.rows[0].db_name,
                tables: Number(result.rows[0].table_count),
                version: result.rows[0].pg_version
              }));
            } catch (err: any) {
              return res.end(JSON.stringify({
                ok: false,
                connected: false,
                error: err.message,
                hint: 'Check PG_PASSWORD in .env or verify PostgreSQL is running in pgAdmin'
              }));
            }
          }

          // Full Sync All Data Endpoint
          if (pathname === '/api/db/sync-all' && req.method === 'GET') {
            try {
              const labourers = (await db.query('SELECT * FROM labourers ORDER BY full_name ASC')).rows;
              const attendance = (await db.query('SELECT * FROM attendance ORDER BY work_date DESC')).rows;
              const advances = (await db.query('SELECT * FROM advances ORDER BY issued_at DESC')).rows;
              const advanceAllocations = (await db.query('SELECT * FROM advance_allocations ORDER BY allocation_date DESC')).rows;
              const tractorRentals = (await db.query('SELECT * FROM tractor_rentals ORDER BY work_date DESC')).rows;
              const payrollPeriods = (await db.query('SELECT * FROM payroll_periods ORDER BY start_date DESC')).rows;
              const payrollLines = (await db.query('SELECT * FROM payroll_lines')).rows;
              const auditLogs = (await db.query('SELECT * FROM audit_logs ORDER BY occurred_at DESC LIMIT 200')).rows;
              const appUsers = (await db.query('SELECT id, farm_id, username, password_hash, full_name, email, role, view_access, is_active FROM app_users ORDER BY created_at ASC')).rows;

              return res.end(JSON.stringify({
                ok: true,
                data: {
                  labourers,
                  attendance,
                  advances,
                  advanceAllocations,
                  tractorRentals,
                  payrollPeriods,
                  payrollLines,
                  auditLogs,
                  appUsers
                }
              }));
            } catch (err: any) {
              return res.end(JSON.stringify({ ok: false, error: err.message }));
            }
          }

          // Generic Query / Upsert Endpoint
          if (pathname === '/api/db/upsert' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                const { table, records } = JSON.parse(body);
                if (!table || !Array.isArray(records) || records.length === 0) {
                  return res.end(JSON.stringify({ ok: false, error: 'Invalid payload' }));
                }

                const validCols = await getTableColumns(db, table);

                // Batch upsert based on table primary key
                for (const row of records) {
                  const keys = Object.keys(row).filter(k => 
                    row[k] !== undefined && (validCols.size === 0 || validCols.has(k))
                  );
                  if (keys.length === 0 || !keys.includes('id')) continue;

                  const values = keys.map(k => {
                    const val = row[k];
                    if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
                      return JSON.stringify(val);
                    }
                    return val;
                  });

                  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
                  const updateClause = keys
                    .filter(k => k !== 'id')
                    .map(k => `"${k}" = EXCLUDED."${k}"`)
                    .join(', ');

                  const sql = `
                    INSERT INTO "${table}" (${keys.map(k => `"${k}"`).join(', ')})
                    VALUES (${placeholders})
                    ON CONFLICT (id) DO UPDATE SET ${updateClause || '"id" = EXCLUDED."id"'}
                  `;
                  await db.query(sql, values);
                }

                return res.end(JSON.stringify({ ok: true, count: records.length }));
              } catch (err: any) {
                return res.end(JSON.stringify({ ok: false, error: err.message }));
              }
            });
            return;
          }

          // Delete Endpoint
          if (pathname === '/api/db/delete' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                const { table, id } = JSON.parse(body);
                if (!table || !id) {
                  return res.end(JSON.stringify({ ok: false, error: 'Table and id required' }));
                }
                await db.query(`DELETE FROM "${table}" WHERE id = $1`, [id]);
                return res.end(JSON.stringify({ ok: true }));
              } catch (err: any) {
                return res.end(JSON.stringify({ ok: false, error: err.message }));
              }
            });
            return;
          }

          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'Not found' }));
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    }
  };
}
