-- Add image_edited column to track if product image has been edited
ALTER TABLE public.product_marketplaces 
ADD COLUMN IF NOT EXISTS image_edited boolean NOT NULL DEFAULT false;