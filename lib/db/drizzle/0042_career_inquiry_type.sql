-- Allow career applications to be stored in the unified inquiries CRM
ALTER TYPE "inquiry_type" ADD VALUE IF NOT EXISTS 'career';
