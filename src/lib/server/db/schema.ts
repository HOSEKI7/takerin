import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const healthCheck = sqliteTable('health_check', {
	id: text('id').primaryKey(),
	service: text('service').notNull(),
	status: text('status').notNull(),
	createdAt: integer('created_at').notNull()
});

export const user = sqliteTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
	image: text('image'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
	role: text('role').notNull().default('user'),
	twoFactorEnabled: integer('two_factor_enabled', { mode: 'boolean' }).notNull().default(false),
	onboardingCompleted: integer('onboarding_completed', { mode: 'boolean' }).notNull().default(false)
});

export const session = sqliteTable('session', {
	id: text('id').primaryKey(),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
	token: text('token').notNull().unique(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' })
});

export const account = sqliteTable('account', {
	id: text('id').primaryKey(),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	idToken: text('id_token'),
	accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
	refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
	scope: text('scope'),
	password: text('password'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const verification = sqliteTable('verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const twoFactor = sqliteTable('two_factor', {
	id: text('id').primaryKey(),
	secret: text('secret').notNull(),
	backupCodes: text('backup_codes').notNull(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	verified: integer('verified', { mode: 'boolean' }).notNull().default(true),
	failedVerificationCount: integer('failed_verification_count').notNull().default(0),
	lockedUntil: integer('locked_until', { mode: 'timestamp' })
});

export const userSettings = sqliteTable('user_settings', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.unique()
		.references(() => user.id, { onDelete: 'cascade' }),
	payDay: integer('pay_day').notNull(),
	language: text('language').notNull().default('id'),
	theme: text('theme').notNull().default('light'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const incomeSource = sqliteTable('income_source', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	amount: integer('amount').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const categoryTemplate = sqliteTable('category_template', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
	categories: text('categories').notNull(),
	isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const monthlyPeriod = sqliteTable('monthly_period', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	startDate: text('start_date').notNull(),
	endDate: text('end_date').notNull(),
	payDay: integer('pay_day').notNull(),
	totalIncome: integer('total_income').notNull(),
	status: text('status').notNull().default('active'),
	aiSummary: text('ai_summary'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const category = sqliteTable('category', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	periodId: text('period_id')
		.notNull()
		.references(() => monthlyPeriod.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	percentage: real('percentage').notNull(),
	isSavings: integer('is_savings', { mode: 'boolean' }).notNull().default(false),
	status: text('status').notNull().default('active'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const expense = sqliteTable('expense', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	periodId: text('period_id')
		.notNull()
		.references(() => monthlyPeriod.id, { onDelete: 'cascade' }),
	categoryId: text('category_id')
		.notNull()
		.references(() => category.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	amount: integer('amount').notNull(),
	date: text('date').notNull(),
	time: text('time'),
	notes: text('notes'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});
