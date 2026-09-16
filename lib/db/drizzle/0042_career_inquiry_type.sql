-- Add career applications to the inquiries CRM pipeline
ALTER TYPE "inquiry_type" ADD VALUE IF NOT EXISTS 'career';
