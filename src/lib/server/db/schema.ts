import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const healthCheck = sqliteTable('health_check', {
	id: text('id').primaryKey(),
	service: text('service').notNull(),
	status: text('status').notNull(),
	createdAt: integer('created_at').notNull()
});
