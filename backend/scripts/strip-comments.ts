import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

const SKIP_DIRS = new Set([
	'node_modules', 'dist', 'build', '.next', 'generated', 'coverage', '.git', '.turbo', 'locales',
]);
const TS_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const LINE_SLASH_EXTS = new Set(['.prisma', '.css', '.scss']); 
const SQL_EXTS = new Set(['.sql']); 

const KEEP_RE =
	/^(\s*|\/\*\s*)?(@ts-(ignore|expect-error|nocheck)|eslint(-plugin)?[^a-z]|biome-ignore|prettier-ignore|istanbul\s+ignore|c8\s+ignore|vite-ignore|webpackIgnore|webpack-disable)/i;

function isKept(commentText: string): boolean {
	return KEEP_RE.test(commentText);
}

function findTsComments(text: string): { start: number; end: number; text: string }[] {
	const scanner = ts.createScanner(ts.ScriptTarget.Latest,  false, ts.LanguageVariant.Standard, text);
	const out: { start: number; end: number; text: string }[] = [];
	let tok: ts.SyntaxKind;
	while ((tok = scanner.scan()) !== ts.SyntaxKind.EndOfFileToken) {
		if (tok === ts.SyntaxKind.SingleLineCommentTrivia || tok === ts.SyntaxKind.MultiLineCommentTrivia) {
			const start = scanner.getTokenStart();
			const end = scanner.getTokenEnd();
			out.push({ start, end, text: text.slice(start, end) });
		}
	}
	return out;
}

function findGenericComments(
	text: string,
	lineToken: '//' | '--',
): { start: number; end: number; text: string }[] {
	const out: { start: number; end: number; text: string }[] = [];
	let i = 0;
	let quote: string | null = null;
	while (i < text.length) {
		const c = text[i];
		if (quote) {
			if (c === '\\') {
				i += 2;
				continue;
			}
			if (c === quote) quote = null;
			i++;
			continue;
		}
		if (c === '"' || c === "'" || c === '`') {
			quote = c;
			i++;
			continue;
		}
		if (text.startsWith(lineToken, i)) {
			const end = text.indexOf('\n', i);
			const stop = end === -1 ? text.length : end;
			out.push({ start: i, end: stop, text: text.slice(i, stop) });
			i = stop;
			continue;
		}
		if (text.startsWith('/*', i)) {
			let close = text.indexOf('*/', i + 2);
			close = close === -1 ? text.length : close + 2;
			out.push({ start: i, end: close, text: text.slice(i, close) });
			i = close;
			continue;
		}
		i++;
	}
	return out;
}

function spliceOut(text: string, ranges: { start: number; end: number }[]): string {
	const sorted = [...ranges].sort((a, b) => b.start - a.start);
	for (const r of sorted) {
		let start = r.start;
		let end = r.end;
		const lineStart = text.lastIndexOf('\n', start - 1) + 1;
		if (text.slice(lineStart, start).trim() === '') {
			start = lineStart;
			if (text[end] === '\n') end += 1;
			else if (text.slice(end).trim() === '' && end < text.length) end = text.length;
		} else if (text[end] !== '\n' && text.slice(end, text.indexOf('\n', end) === -1 ? text.length : text.indexOf('\n', end)).trim() === '') {
			start = Math.max(lineStart, text.slice(lineStart, r.start).replace(/[ \t]+$/, '').length + lineStart);
		}
		text = text.slice(0, start) + text.slice(end);
	}
	return text.replace(/\n{3,}/g, '\n\n');
}

const root = path.resolve(process.argv[2] ?? '..');
const apply = process.argv.includes('--apply');

const stats: Record<string, { files: number; comments: number }> = {};

function walk(dir: string) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name));
			continue;
		}
		const ext = path.extname(entry.name).toLowerCase();
		const kind = TS_EXTS.has(ext)
			? 'ts'
			: LINE_SLASH_EXTS.has(ext)
				? 'slash'
				: SQL_EXTS.has(ext)
					? 'sql'
					: null;
		if (!kind) continue;

		const file = path.join(dir, entry.name);
		const original = fs.readFileSync(file, 'utf8');
		let comments;
		if (kind === 'ts') {
			comments = findTsComments(original).filter((c) => !isKept(c.text) && !c.text.startsWith('#!'));
		} else if (kind === 'sql') {
			comments = findGenericComments(original, '--');
		} else {
			comments = findGenericComments(original, '//');
		}
		if (!comments.length) continue;

		const cleaned = spliceOut(original, comments);
		if (!cleaned.trim()) {
			console.log(`SKIP (empty result!) ${path.relative(root, file)}`);
			continue;
		}
		const bucket = (stats[ext] ??= { files: 0, comments: 0 });
		bucket.files++;
		bucket.comments += comments.length;
		console.log(`${apply ? 'STRIP' : 'WOULD'} ${path.relative(root, file)} (${comments.length} comments)`);
		if (apply) fs.writeFileSync(file, cleaned, 'utf8');
	}
}

walk(root);

let totalFiles = 0;
let totalComments = 0;
for (const [ext, s] of Object.entries(stats)) {
	totalFiles += s.files;
	totalComments += s.comments;
	console.log(`  ${ext}: ${s.files} files, ${s.comments} comments`);
}
console.log(totalComments ? `\n${totalFiles} files, ${totalComments} comments ${apply ? 'ĐÃ XÓA' : '(dry-run — thêm --apply để xóa thật)'}` : '\nKhông tìm thấy comment nào.');
