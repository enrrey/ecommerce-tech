ALTER TABLE "products" ADD COLUMN "brand" varchar(60);--> statement-breakpoint
CREATE INDEX "products_brand_idx" ON "products" USING btree ("brand");