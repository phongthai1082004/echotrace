import { existsSync } from 'fs';
import path from 'path';
import { google } from 'googleapis';

// Chưa cấu hình (thiếu GA_PROPERTY_ID/credentials) → trả null, UI hiện "…".

export interface GaSourceRow {
	source: string;
	visitors: number;
	opened: number;
	preview: number;
	checkout: number;
}

const SCOPES = ['https://www.googleapis.com/auth/analytics.readonly'];

function normSource(v?: string | null): string {
	const s = (v || '').trim().toLowerCase();
	if (!s || s === '(direct)' || s === '(none)') return 'unknown';
	return s;
}

export async function getGaTrafficBySource(days: number): Promise<GaSourceRow[] | null> {
	const propertyId = process.env.GA_PROPERTY_ID;
	if (!propertyId) return null;
	try {
		// docker chạy CWD=root, khỏi đoán path trong env
		const keyPath = process.env.GA_CREDENTIALS_PATH;
		const candidates = keyPath
			? [keyPath, path.join(process.cwd(), keyPath), path.join(process.cwd(), 'backend', keyPath)]
			: [];
		const keyFile = candidates.find((p) => { try { return existsSync(p); } catch { return false; } });
		if (process.env.GA_PROPERTY_ID && !keyFile && !process.env.GA_CREDENTIALS_JSON) {
			console.warn(`[ga-data] key file not found (cwd=${process.cwd()}): ${JSON.stringify(candidates)}`);
			return null;
		}
		const auth = new google.auth.GoogleAuth({
			keyFile,
			credentials: process.env.GA_CREDENTIALS_JSON ? JSON.parse(process.env.GA_CREDENTIALS_JSON) : undefined,
			scopes: SCOPES,
		});
		const analyticsdata = google.analyticsdata({ version: 'v1beta', auth });
		const property = `properties/${propertyId}`;
		const dateRanges = [{ startDate: `${days}daysAgo`, endDate: 'today' }];

		const [sessions, events] = await Promise.all([
			analyticsdata.properties.runReport({
				property,
				requestBody: {
					dateRanges,
					dimensions: [{ name: 'sessionSource' }],
					metrics: [{ name: 'sessions' }],
					limit: '50',
				},
			}),
			analyticsdata.properties.runReport({
				property,
				requestBody: {
					dateRanges,
					dimensions: [{ name: 'sessionSource' }, { name: 'eventName' }],
					metrics: [{ name: 'eventCount' }],
					dimensionFilter: {
						filter: { fieldName: 'eventName', inListFilter: { values: ['open_studio', 'view_preview', 'begin_checkout'] } },
					},
					limit: '200',
				},
			}),
		]);

		const bySource: Record<string, GaSourceRow> = {};
		const get = (k: string) => (bySource[k] ??= { source: k, visitors: 0, opened: 0, preview: 0, checkout: 0 });
		for (const r of sessions.data.rows ?? []) {
			const row = get(normSource(r.dimensionValues?.[0]?.value));
			row.visitors += Number(r.metricValues?.[0]?.value ?? 0);
		}
		for (const r of events.data.rows ?? []) {
			const row = get(normSource(r.dimensionValues?.[0]?.value));
			const n = Number(r.metricValues?.[0]?.value ?? 0);
			const ev = r.dimensionValues?.[1]?.value;
			if (ev === 'open_studio') row.opened += n;
			else if (ev === 'view_preview') row.preview += n;
			else if (ev === 'begin_checkout') row.checkout += n;
		}
		return Object.values(bySource).sort((a, b) => b.visitors - a.visitors);
	} catch (e) {
		console.warn('[ga-data] fetch failed:', (e as Error)?.message || e);
		return null;
	}
}
